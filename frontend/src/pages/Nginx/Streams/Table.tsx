import { createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import type { Stream } from "src/api/backend";
import {
	CertificateFormatter,
	EmptyData,
	GravatarFormatter,
	HostActionsDropdown,
	StatusFormatter,
	ValueWithDateFormatter,
} from "src/components";
import { TableLayout } from "src/components/Table/TableLayout";
import { intl, T } from "src/locale";
import { STREAMS } from "src/modules/Permissions";

interface Props {
	data: Stream[];
	isFiltered?: boolean;
	isFetching?: boolean;
	onEdit?: (id: number) => void;
	onDelete?: (id: number) => void;
	onDisableToggle?: (id: number, enabled: boolean) => void;
	onNew?: () => void;
}
export default function Table({ data, isFetching, isFiltered, onEdit, onDelete, onDisableToggle, onNew }: Props) {
	const columnHelper = createColumnHelper<Stream>();
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
			columnHelper.accessor((row: any) => row.incomingPort, {
				id: "incomingPort",
				header: intl.formatMessage({ id: "column.incoming-port" }),
				cell: (info: any) => {
					const value = info.row.original;
					return <ValueWithDateFormatter value={value.incomingPort} createdOn={value.createdOn} />;
				},
			}),
			columnHelper.accessor((row: any) => row.npmplusDescription || "", {
				id: "npmplusDescription",
				header: intl.formatMessage({ id: "column.description" }),
				cell: (info: any) => {
					const value = info.row.original.npmplusDescription;
					return value || <span className="text-muted">—</span>;
				},
			}),
			columnHelper.accessor(
				(row: any) => `${row.forwardingHost}${row.forwardingPort ? `:${row.forwardingPort}` : ""}`,
				{
					id: "destination",
					header: intl.formatMessage({ id: "column.destination" }),
					cell: (info: any) => {
						return info.getValue();
					},
				},
			),
			columnHelper.accessor(
				(row: any) => {
					const protocols = [];
					if (row.tcpForwarding) protocols.push("TCP");
					if (row.npmplusProxyProtocolForwarding) protocols.push("PP");
					if (row.npmplusProxyTls) protocols.push("TLS");
					if (row.udpForwarding) protocols.push("UDP");
					return protocols.join(" ");
				},
				{
					id: "protocol",
					header: intl.formatMessage({ id: "column.protocol" }),
					cell: (info: any) => {
						const value = info.row.original;
						return (
							<>
								{value.tcpForwarding ? (
									<span className="badge badge-lg domain-name">
										<T id="streams.tcp" />
									</span>
								) : null}
								{value.npmplusProxyProtocolForwarding ? (
									<span className="badge badge-lg domain-name">
										<T id="streams.pp" />
									</span>
								) : null}
								{value.npmplusProxyTls ? (
									<span className="badge badge-lg domain-name">
										<T id="streams.tls" />
									</span>
								) : null}
								{value.udpForwarding ? (
									<span className="badge badge-lg domain-name">
										<T id="streams.udp" />
									</span>
								) : null}
							</>
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
						object="stream"
						id={info.row.original.id}
						enabled={info.row.original.enabled}
						permissionSection={STREAMS}
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
		[columnHelper, onEdit, onDisableToggle, onDelete],
	);

	const tableInstance = useReactTable<Stream>({
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
					object="stream"
					objects="streams"
					tableInstance={tableInstance}
					onNew={onNew}
					isFiltered={isFiltered}
					color="blue"
					permissionSection={STREAMS}
				/>
			}
		/>
	);
}
