import { createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import type { ProxyHost } from "src/api/backend";
import {
	AccessListFormatter,
	CertificateFormatter,
	DomainsFormatter,
	EmptyData,
	faviconDomain,
	HostActionsDropdown,
	OwnerAvatar,
	StatusFormatter,
} from "src/components";
import { TableLayout } from "src/components/Table/TableLayout";
import { intl } from "src/locale";
import { PROXY_HOSTS } from "src/modules/Permissions";

interface Props {
	data: ProxyHost[];
	isFiltered?: boolean;
	isFetching?: boolean;
	onEdit?: (id: number) => void;
	onClone?: (id: number) => void;
	onDelete?: (id: number) => void;
	onDisableToggle?: (id: number, enabled: boolean) => void;
	onNew?: () => void;
	showOwnerFavicon?: boolean;
	showDomainFavicon?: boolean;
}
export default function Table({
	data,
	isFetching,
	onEdit,
	onClone,
	onDelete,
	onDisableToggle,
	onNew,
	isFiltered,
	showOwnerFavicon,
	showDomainFavicon,
}: Props) {
	const columnHelper = createColumnHelper<ProxyHost>();
	const columns = useMemo(
		() => [
			columnHelper.accessor((row: any) => row.owner.name, {
				id: "owner",
				cell: (info: any) => {
					const value = info.row.original.owner;
					return (
						<OwnerAvatar
							favicon={showOwnerFavicon ? faviconDomain(info.row.original.domainNames) : null}
							avatarUrl={value?.avatar}
							name={value?.name}
						/>
					);
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
					return (
						<DomainsFormatter
							domains={value.domainNames}
							createdOn={value.createdOn}
							showFavicon={showDomainFavicon}
						/>
					);
				},
			}),
			columnHelper.accessor(
				(row: any) =>
					`${row.forwardScheme}://${row.forwardHost}${row.forwardPort ? `:${row.forwardPort}` : ""}`,
				{
					id: "forwardHost",
					header: intl.formatMessage({ id: "column.destination" }),
					cell: (info: any) => {
						return (
							<a href={info.getValue()} target="_blank" rel="noopener">
								{info.getValue()}
							</a>
						);
					},
				},
			),
			columnHelper.accessor((row: any) => (row.certificate ? row.certificate.provider : "http-only"), {
				id: "certificate",
				header: intl.formatMessage({ id: "column.ssl" }),
				cell: (info: any) => {
					return <CertificateFormatter certificate={info.row.original.certificate} />;
				},
			}),
			columnHelper.accessor(
				(row: any) => {
					const accessLists = row.accessLists || [];
					const triggerLabel = intl.formatMessage({
						id: row.npmplusAccessListType === "custom" ? "access-list.custom" : "access-list.public",
					});
					if (accessLists.length === 1) {
						return accessLists[0].name;
					}
					return triggerLabel;
				},
				{
					id: "accessList",
					header: intl.formatMessage({ id: "column.access" }),
					cell: (info: any) => {
						return (
							<AccessListFormatter
								proxyHostId={info.row.original.id}
								locations={info.row.original.locations}
								access={info.row.original.accessLists}
								type={info.row.original.npmplusAccessListType}
							/>
						);
					},
				},
			),
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
						object="proxy-host"
						id={info.row.original.id}
						enabled={info.row.original.enabled}
						permissionSection={PROXY_HOSTS}
						onEdit={onEdit}
						onClone={onClone}
						onDelete={onDelete}
						onDisableToggle={onDisableToggle}
					/>
				),
				meta: {
					className: "text-end w-1",
				},
			}),
		],
		[columnHelper, onEdit, onClone, onDisableToggle, onDelete, showOwnerFavicon, showDomainFavicon],
	);

	const tableInstance = useReactTable<ProxyHost>({
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
					object="proxy-host"
					objects="proxy-hosts"
					tableInstance={tableInstance}
					onNew={onNew}
					isFiltered={isFiltered}
					color="lime"
					permissionSection={PROXY_HOSTS}
				/>
			}
		/>
	);
}
