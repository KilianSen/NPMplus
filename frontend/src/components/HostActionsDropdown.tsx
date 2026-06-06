import { IconCopy, IconDotsVertical, IconEdit, IconPower, IconTrash } from "@tabler/icons-react";
import { T } from "src/locale";
import { MANAGE, type Section } from "src/modules/Permissions";
import { HasPermission } from "./HasPermission";

interface Props {
	/** i18n object key, e.g. "proxy-host" / "redirection-host" / "dead-host". */
	object: string;
	id: number;
	enabled: boolean;
	permissionSection: Section;
	onEdit?: (id: number) => void;
	/** Optional: only proxy hosts support cloning. */
	onClone?: (id: number) => void;
	onDelete?: (id: number) => void;
	onDisableToggle?: (id: number, enabled: boolean) => void;
}

/**
 * The per-host actions dropdown (edit / clone / enable-disable / delete), shared by
 * both the flat tables and the grouped tree view.
 */
export function HostActionsDropdown({
	object,
	id,
	enabled,
	permissionSection,
	onEdit,
	onClone,
	onDelete,
	onDisableToggle,
}: Props) {
	return (
		<span className="dropdown">
			<button
				type="button"
				className="btn dropdown-toggle btn-action btn-sm px-1"
				data-bs-boundary="viewport"
				data-bs-toggle="dropdown"
			>
				<IconDotsVertical />
			</button>
			<div className="dropdown-menu dropdown-menu-end">
				<span className="dropdown-header">
					<T id="object.actions-title" tData={{ object }} data={{ id }} />
				</span>
				<a
					className="dropdown-item"
					href="#"
					onClick={(e) => {
						e.preventDefault();
						onEdit?.(id);
					}}
				>
					<IconEdit size={16} />
					<T id="action.edit" />
				</a>
				{onClone ? (
					<a
						className="dropdown-item"
						href="#"
						onClick={(e) => {
							e.preventDefault();
							onClone(id);
						}}
					>
						<IconCopy size={16} />
						<T id="action.clone" />
					</a>
				) : null}
				<HasPermission section={permissionSection} permission={MANAGE} hideError>
					<a
						className="dropdown-item"
						href="#"
						onClick={(e) => {
							e.preventDefault();
							onDisableToggle?.(id, !enabled);
						}}
					>
						<IconPower size={16} />
						<T id={enabled ? "action.disable" : "action.enable"} />
					</a>
					<div className="dropdown-divider" />
					<a
						className="dropdown-item"
						href="#"
						onClick={(e) => {
							e.preventDefault();
							onDelete?.(id);
						}}
					>
						<IconTrash size={16} />
						<T id="action.delete" />
					</a>
				</HasPermission>
			</div>
		</span>
	);
}
