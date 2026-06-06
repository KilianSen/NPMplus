import { IconHelp, IconList, IconSearch } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import type { DeadHost } from "src/api/backend";
import { deleteDeadHost, toggleDeadHost } from "src/api/backend";
import {
	Button,
	CertificateFormatter,
	HasPermission,
	HostActionsDropdown,
	LoadingPage,
	makeGroupedTreeView,
	StatusFormatter,
	useDataView,
	type ViewDefinition,
} from "src/components";
import { useDeadHosts } from "src/hooks";
import { T } from "src/locale";
import { showDeadHostModal, showDeleteConfirmModal, showHelpModal } from "src/modals";
import { DEAD_HOSTS, MANAGE } from "src/modules/Permissions";
import { showObjectSuccess } from "src/notifications";
import Table from "./Table";

export default function TableWrapper() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const { isFetching, isLoading, isError, error, data } = useDeadHosts(["owner", "certificate"]);

	const handleDelete = async (id: number) => {
		await deleteDeadHost(id);
		showObjectSuccess("dead-host", "deleted");
	};

	const handleDisableToggle = async (id: number, enabled: boolean) => {
		await toggleDeadHost(id, enabled);
		queryClient.invalidateQueries({ queryKey: ["dead-hosts"] });
		queryClient.invalidateQueries({ queryKey: ["dead-host", id] });
		showObjectSuccess("dead-host", enabled ? "enabled" : "disabled");
	};

	const handleEdit = (id: number) => showDeadHostModal(id);
	const handleDeleteConfirm = (id: number) =>
		showDeleteConfirmModal({
			title: <T id="object.delete" tData={{ object: "dead-host" }} />,
			onConfirm: () => handleDelete(id),
			invalidations: [["dead-hosts"], ["dead-host", id]],
			children: <T id="object.delete.content" tData={{ object: "dead-host" }} />,
		});

	let filtered = null;
	if (search && data) {
		filtered = data?.filter((item) => {
			return item.domainNames.some((domain: string) => domain.toLowerCase().includes(search));
		});
	} else if (search !== "") {
		// this can happen if someone deletes the last item while searching
		setSearch("");
	}

	const rows = filtered ?? data ?? [];

	const flatView: ViewDefinition<DeadHost> = {
		id: "flat",
		label: "view.flat",
		icon: <IconList size={18} />,
		render: ({ data }) => (
			<Table
				data={data}
				isFiltered={!!search}
				isFetching={isFetching}
				onEdit={handleEdit}
				onDelete={handleDeleteConfirm}
				onDisableToggle={handleDisableToggle}
				onNew={() => showDeadHostModal("new")}
			/>
		),
	};

	const groupedView = makeGroupedTreeView<DeadHost>({
		getDomains: (h) => h.domainNames,
		getCreatedOn: (h) => h.createdOn,
		getRowKey: (h) => h.id,
		renderDetail: (h) => (
			<div className="d-flex flex-wrap align-items-center gap-2">
				<CertificateFormatter certificate={h.certificate} />
				<StatusFormatter enabled={h.enabled} nginxOnline={h.meta.nginxOnline} nginxErr={h.meta.nginxErr} />
			</div>
		),
		renderActions: (h) => (
			<HostActionsDropdown
				object="dead-host"
				id={h.id}
				enabled={h.enabled}
				permissionSection={DEAD_HOSTS}
				onEdit={handleEdit}
				onDelete={handleDeleteConfirm}
				onDisableToggle={handleDisableToggle}
			/>
		),
		color: "red",
	});

	const { controls, content } = useDataView({
		screenKey: "dead-hosts",
		data: rows,
		views: [flatView, groupedView],
	});

	if (isLoading) {
		return <LoadingPage />;
	}

	if (isError) {
		return <Alert variant="danger">{error?.message || "Unknown error"}</Alert>;
	}

	return (
		<div className="card mt-4">
			<div className="card-status-top bg-red" />
			<div className="card-table">
				<div className="card-header">
					<div className="row w-full">
						<div className="col">
							<h2 className="mt-1 mb-0">
								<T id="dead-hosts" />
							</h2>
						</div>

						<div className="col-md-auto col-sm-12">
							<div className="ms-auto d-flex flex-wrap btn-list">
								{data?.length ? controls : null}
								{data?.length ? (
									<div className="input-group input-group-flat w-auto">
										<span className="input-group-text input-group-text-sm">
											<IconSearch size={16} />
										</span>
										<input
											id="advanced-table-search"
											type="text"
											className="form-control form-control-sm"
											autoComplete="off"
											onChange={(e: any) => setSearch(e.target.value.toLowerCase().trim())}
										/>
									</div>
								) : null}
								<Button size="sm" onClick={() => showHelpModal("DeadHosts")}>
									<IconHelp size={20} />
								</Button>
								<HasPermission section={DEAD_HOSTS} permission={MANAGE} hideError>
									{data?.length ? (
										<Button size="sm" className="btn-red" onClick={() => showDeadHostModal("new")}>
											<T id="object.add" tData={{ object: "dead-host" }} />
										</Button>
									) : null}
								</HasPermission>
							</div>
						</div>
					</div>
				</div>
				{content}
			</div>
		</div>
	);
}
