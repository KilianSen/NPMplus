import { createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import type { DeadHost } from "src/api/backend";
import {
	CertificateFormatter,
	DomainsFormatter,
	EmptyData,
	GravatarFormatter,
	HostActionsDropdown,
	StatusFormatter,
} from "src/components";
import { TableLayout } from "src/components/Table/TableLayout";
import { intl } from "src/locale";
import { DEAD_HOSTS } from "src/modules/Permissions";

interface Props {
	data: DeadHost[];
	isFiltered?: boolean;
	isFetching?: boolean;
	onEdit?: (id: number) => void;
	onDelete?: (id: number) => void;
	onDisableToggle?: (id: number, enabled: boolean) => void;
	onNew?: () => void;
}
export default function Table({ data, isFetching, onEdit, onDelete, onDisableToggle, onNew, isFiltered }: Props) {
	const columnHelper = createColumnHelper<DeadHost>();
	const columns = useMemo(
		() => [
			columnHelper.accessor((row: any) => row.owner.name, {
				id: "owner",
				cell: (info: any) => {
					const value = info.row.original.owner;
					return <GravatarFormatter url={value ? value.avatar : ""} name={value ? value.name : ""} />;
				},
				meta: {
					className: "w-1",
				},
			}),
			columnHelper.accessor((row: any) => row.domainNames.join(", "), {
				id: "domainNames",
				header: intl.formatMessage({ id: "column.source" }),
				cell: (info: any) => {
					const value = info.row.original;
					return <DomainsFormatter domains={value.domainNames} createdOn={value.createdOn} />;
				},
			}),
			columnHelper.accessor((row: any) => (row.certificate ? row.certificate.provider : "http-only"), {
				id: "certificate",
				header: intl.formatMessage({ id: "column.ssl" }),
				cell: (info: any) => {
					return <CertificateFormatter certificate={info.row.original.certificate} />;
				},
			}),
			columnHelper.accessor(
				(row: any) => {
					if (!row.enabled) return "3disabled";
					if (row.meta.nginxOnline) return "2online";
					return "1offline";
				},
				{
					id: "enabled",
					header: intl.formatMessage({ id: "column.status" }),
					cell: (info: any) => {
						const value = info.row.original;
						return (
							<StatusFormatter
								enabled={value.enabled}
								nginxOnline={value.meta.nginxOnline}
								nginxErr={value.meta.nginxErr}
							/>
						);
					},
				},
			),
			columnHelper.accessor((row: any) => row.id, {
				id: "id",
				header: "ID",
				cell: (info: any) => info.getValue(),
				meta: {
					className: "text-end w-1",
				},
			}),
			columnHelper.display({
				id: "actions",
				cell: (info: any) => (
					<HostActionsDropdown
						object="dead-host"
						id={info.row.original.id}
						enabled={info.row.original.enabled}
						permissionSection={DEAD_HOSTS}
						onEdit={onEdit}
						onDelete={onDelete}
						onDisableToggle={onDisableToggle}
					/>
				),
				meta: {
					className: "text-end w-1",
				},
			}),
		],
		[columnHelper, onDelete, onEdit, onDisableToggle],
	);

	const tableInstance = useReactTable<DeadHost>({
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
					object="dead-host"
					objects="dead-hosts"
					tableInstance={tableInstance}
					onNew={onNew}
					isFiltered={isFiltered}
					color="red"
					permissionSection={DEAD_HOSTS}
				/>
			}
		/>
	);
}
