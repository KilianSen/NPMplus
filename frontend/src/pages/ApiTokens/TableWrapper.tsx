import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import Alert from "react-bootstrap/Alert";
import { type ApiToken, deleteApiToken } from "src/api/backend";
import { Button, LoadingPage } from "src/components";
import { useApiTokens } from "src/hooks";
import { T } from "src/locale";
import { showApiTokenModal, showDeleteConfirmModal } from "src/modals";
import { showObjectSuccess } from "src/notifications";
import Table from "./Table";

export default function TableWrapper() {
	const [search, setSearch] = useState("");
	const { isFetching, isLoading, isError, error, data } = useApiTokens();

	if (isLoading) {
		return <LoadingPage />;
	}

	if (isError) {
		return <Alert variant="danger">{error?.message || "Unknown error"}</Alert>;
	}

	const handleDelete = async (id: number) => {
		await deleteApiToken(id);
		showObjectSuccess("api-token", "deleted");
	};

	let filtered: ApiToken[] | null = null;
	if (search && data) {
		filtered = data.filter((item) => item.name.toLowerCase().includes(search));
	} else if (search !== "") {
		setSearch("");
	}

	return (
		<div className="card mt-4">
			<div className="card-status-top bg-orange" />
			<div className="card-table">
				<div className="card-header">
					<div className="row w-full">
						<div className="col">
							<h2 className="mt-1 mb-0">
								<T id="api-tokens" />
							</h2>
						</div>
						{data?.length ? (
							<div className="col-md-auto col-sm-12">
								<div className="ms-auto d-flex flex-wrap btn-list">
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

									<Button size="sm" className="btn-orange" onClick={() => showApiTokenModal()}>
										<T id="object.add" tData={{ object: "api-token" }} />
									</Button>
								</div>
							</div>
						) : null}
					</div>
				</div>
				<Table
					data={filtered ?? data ?? []}
					isFiltered={!!search}
					isFetching={isFetching}
					onNew={() => showApiTokenModal()}
					onEdit={(token) => showApiTokenModal(token)}
					onDelete={(id: number) =>
						showDeleteConfirmModal({
							title: <T id="api-token.revoke" />,
							onConfirm: () => handleDelete(id),
							invalidations: [["api-tokens"]],
							children: <T id="api-token.revoke.content" />,
						})
					}
				/>
			</div>
		</div>
	);
}
