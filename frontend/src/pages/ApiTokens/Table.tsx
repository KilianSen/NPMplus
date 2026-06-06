import { IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react";
import { createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import type { ApiToken } from "src/api/backend";
import { EmptyData } from "src/components";
import { DateFormatter } from "src/components/Table/Formatter";
import { TableLayout } from "src/components/Table/TableLayout";
import { intl, T } from "src/locale";

interface Props {
	data: ApiToken[];
	isFiltered?: boolean;
	isFetching?: boolean;
	onEdit?: (token: ApiToken) => void;
	onDelete?: (id: number) => void;
	onNew?: () => void;
}

export default function Table({ data, isFiltered, isFetching, onEdit, onDelete, onNew }: Props) {
	const columnHelper = createColumnHelper<ApiToken>();
	const columns = useMemo(
		() => [
			columnHelper.accessor((row) => row.name, {
				id: "name",
				header: intl.formatMessage({ id: "column.name" }),
				cell: (info) => info.getValue(),
			}),
			columnHelper.accessor((row) => row.prefix, {
				id: "prefix",
				header: intl.formatMessage({ id: "column.token" }),
				cell: (info) => <span className="font-monospace text-secondary">{info.getValue()}…</span>,
			}),
			columnHelper.accessor((row) => row.createdOn, {
				id: "createdOn",
				header: intl.formatMessage({ id: "column.created" }),
				cell: (info) => <DateFormatter value={info.getValue()} />,
			}),
			columnHelper.accessor((row) => row.lastUsedOn, {
				id: "lastUsedOn",
				header: intl.formatMessage({ id: "column.last-used" }),
				cell: (info) =>
					info.getValue() ? (
						<DateFormatter value={info.getValue() as string} />
					) : (
						<span className="text-secondary">
							<T id="api-token.never-used" />
						</span>
					),
			}),
			columnHelper.accessor((row) => row.expiresOn, {
				id: "expiresOn",
				header: intl.formatMessage({ id: "column.expires" }),
				cell: (info) =>
					info.getValue() ? (
						<DateFormatter value={info.getValue() as string} highlightPast highlistNearlyExpired />
					) : (
						<span className="text-secondary">
							<T id="api-token.expiry-never" />
						</span>
					),
			}),
			columnHelper.accessor((row) => row.id, {
				id: "id",
				header: "ID",
				cell: (info) => info.getValue(),
				meta: {
					className: "text-end w-1",
				},
			}),
			columnHelper.display({
				id: "actions",
				cell: (info) => {
					const token = info.row.original;
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
									<T
										id="object.actions-title"
										tData={{ object: "api-token" }}
										data={{ id: token.id }}
									/>
								</span>
								<a
									className="dropdown-item"
									href="#"
									onClick={(e) => {
										e.preventDefault();
										onEdit?.(token);
									}}
								>
									<IconEdit size={16} />
									<T id="action.edit" />
								</a>
								<div className="dropdown-divider" />
								<a
									className="dropdown-item"
									href="#"
									onClick={(e) => {
										e.preventDefault();
										onDelete?.(token.id);
									}}
								>
									<IconTrash size={16} />
									<T id="api-token.revoke" />
								</a>
							</div>
						</span>
					);
				},
				meta: {
					className: "text-end w-1",
				},
			}),
		],
		[columnHelper, onEdit, onDelete],
	);

	const tableInstance = useReactTable<ApiToken>({
		columns,
		data,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		rowCount: data.length,
		meta: {
			isFetching,
		},
		enableSortingRemoval: false,
	});

	return (
		<TableLayout
			tableInstance={tableInstance}
			emptyState={
				<EmptyData
					object="api-token"
					objects="api-tokens"
					tableInstance={tableInstance}
					onNew={onNew}
					isFiltered={isFiltered}
					color="orange"
				/>
			}
		/>
	);
}
