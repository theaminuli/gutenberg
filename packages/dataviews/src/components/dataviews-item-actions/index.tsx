/**
 * External dependencies
 */
import type { MouseEventHandler, ReactElement } from 'react';

/**
 * WordPress dependencies
 */
import {
	Button,
	Modal,
	__experimentalHStack as HStack,
	privateApis as componentsPrivateApis,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { moreVertical } from '@wordpress/icons';
import { useRegistry } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { unlock } from '../../lock-unlock';
import type { Action, ActionModal as ActionModalType } from '../../types';

const { Menu, kebabCase } = unlock( componentsPrivateApis );

export interface ActionTriggerProps< Item > {
	action: Action< Item >;
	onClick: MouseEventHandler;
	isBusy?: boolean;
	items: Item[];
}

interface ActionModalProps< Item > {
	action: ActionModalType< Item >;
	items: Item[];
	closeModal?: () => void;
}

interface ActionWithModalProps< Item > extends ActionModalProps< Item > {
	ActionTrigger: ( props: ActionTriggerProps< Item > ) => ReactElement;
	isBusy?: boolean;
}

interface ActionsMenuGroupProps< Item > {
	actions: Action< Item >[];
	item: Item;
}

interface ItemActionsProps< Item > {
	item: Item;
	actions: Action< Item >[];
	isCompact?: boolean;
}

interface CompactItemActionsProps< Item > {
	item: Item;
	actions: Action< Item >[];
}

function ButtonTrigger< Item >( {
	action,
	onClick,
	items,
}: ActionTriggerProps< Item > ) {
	const label =
		typeof action.label === 'string' ? action.label : action.label( items );
	return (
		<Button
			label={ label }
			icon={ action.icon }
			isDestructive={ action.isDestructive }
			size="compact"
			onClick={ onClick }
		/>
	);
}

function MenuItemTrigger< Item >( {
	action,
	onClick,
	items,
}: ActionTriggerProps< Item > ) {
	const label =
		typeof action.label === 'string' ? action.label : action.label( items );
	return (
		<Menu.Item
			onClick={ onClick }
			hideOnClick={ ! ( 'RenderModal' in action ) }
		>
			<Menu.ItemLabel>{ label }</Menu.ItemLabel>
		</Menu.Item>
	);
}

export function ActionModal< Item >( {
	action,
	items,
	closeModal,
}: ActionModalProps< Item > ) {
	const label =
		typeof action.label === 'string' ? action.label : action.label( items );
	return (
		<Modal
			title={ action.modalHeader || label }
			__experimentalHideHeader={ !! action.hideModalHeader }
			onRequestClose={ closeModal ?? ( () => {} ) }
			focusOnMount="firstContentElement"
			size="small"
			overlayClassName={ `dataviews-action-modal dataviews-action-modal__${ kebabCase(
				action.id
			) }` }
		>
			<action.RenderModal items={ items } closeModal={ closeModal } />
		</Modal>
	);
}

export function ActionWithModal< Item >( {
	action,
	items,
	ActionTrigger,
	isBusy,
}: ActionWithModalProps< Item > ) {
	const [ isModalOpen, setIsModalOpen ] = useState( false );
	const actionTriggerProps = {
		action,
		onClick: () => {
			setIsModalOpen( true );
		},
		items,
		isBusy,
	};
	return (
		<>
			<ActionTrigger { ...actionTriggerProps } />
			{ isModalOpen && (
				<ActionModal
					action={ action }
					items={ items }
					closeModal={ () => setIsModalOpen( false ) }
				/>
			) }
		</>
	);
}

export function ActionsMenuGroup< Item >( {
	actions,
	item,
}: ActionsMenuGroupProps< Item > ) {
	const registry = useRegistry();
	return (
		<Menu.Group>
			{ actions.map( ( action ) => {
				if ( 'RenderModal' in action ) {
					return (
						<ActionWithModal
							key={ action.id }
							action={ action }
							items={ [ item ] }
							ActionTrigger={ MenuItemTrigger }
						/>
					);
				}
				return (
					<MenuItemTrigger
						key={ action.id }
						action={ action }
						onClick={ () => {
							action.callback( [ item ], { registry } );
						} }
						items={ [ item ] }
					/>
				);
			} ) }
		</Menu.Group>
	);
}

export default function ItemActions< Item >( {
	item,
	actions,
	isCompact,
}: ItemActionsProps< Item > ) {
	const registry = useRegistry();
	const { primaryActions, eligibleActions } = useMemo( () => {
		// If an action is eligible for all items, doesn't need
		// to provide the `isEligible` function.
		const _eligibleActions = actions.filter(
			( action ) => ! action.isEligible || action.isEligible( item )
		);
		const _primaryActions = _eligibleActions.filter(
			( action ) => action.isPrimary && !! action.icon
		);
		return {
			primaryActions: _primaryActions,
			eligibleActions: _eligibleActions,
		};
	}, [ actions, item ] );
	if ( isCompact ) {
		return <CompactItemActions item={ item } actions={ eligibleActions } />;
	}
	return (
		<HStack
			spacing={ 1 }
			justify="flex-end"
			className="dataviews-item-actions"
			style={ {
				flexShrink: '0',
				width: 'auto',
			} }
		>
			{ !! primaryActions.length &&
				primaryActions.map( ( action ) => {
					if ( 'RenderModal' in action ) {
						return (
							<ActionWithModal
								key={ action.id }
								action={ action }
								items={ [ item ] }
								ActionTrigger={ ButtonTrigger }
							/>
						);
					}
					return (
						<ButtonTrigger
							key={ action.id }
							action={ action }
							onClick={ () => {
								action.callback( [ item ], { registry } );
							} }
							items={ [ item ] }
						/>
					);
				} ) }
			<CompactItemActions item={ item } actions={ eligibleActions } />
		</HStack>
	);
}

function CompactItemActions< Item >( {
	item,
	actions,
}: CompactItemActionsProps< Item > ) {
	return (
		<Menu
			trigger={
				<Button
					size="compact"
					icon={ moreVertical }
					label={ __( 'Actions' ) }
					accessibleWhenDisabled
					disabled={ ! actions.length }
					className="dataviews-all-actions-button"
				/>
			}
			placement="bottom-end"
		>
			<ActionsMenuGroup actions={ actions } item={ item } />
		</Menu>
	);
}
