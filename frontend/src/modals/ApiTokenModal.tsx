import { IconCopy } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import EasyModal, { type InnerModalProps } from "ez-modal-react";
import { Field, Form, Formik } from "formik";
import { useState } from "react";
import { Alert } from "react-bootstrap";
import Modal from "react-bootstrap/Modal";
import { type ApiToken, createApiToken, updateApiToken } from "src/api/backend";
import { Button } from "src/components";
import { intl, T } from "src/locale";
import { validateString } from "src/modules/Validations";
import { showError, showObjectSuccess, showSuccess } from "src/notifications";

const showApiTokenModal = (token?: ApiToken) => {
	EasyModal.show(ApiTokenModal, { token });
};

interface Props extends InnerModalProps {
	token?: ApiToken;
}

// Expiry presets offered in the dropdown. Empty string means "never expires".
const EXPIRY_OPTIONS = [
	{ value: "7d", labelId: "api-token.expiry-7d" },
	{ value: "30d", labelId: "api-token.expiry-30d" },
	{ value: "90d", labelId: "api-token.expiry-90d" },
	{ value: "1y", labelId: "api-token.expiry-1y" },
	{ value: "", labelId: "api-token.expiry-never" },
];

const ApiTokenModal = EasyModal.create(({ token, visible, remove }: Props) => {
	const queryClient = useQueryClient();
	const isEdit = !!token?.id;
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	// Once a token is created, hold the plaintext secret here to show it exactly once.
	const [createdSecret, setCreatedSecret] = useState<string | null>(null);

	const onSubmit = async (values: any, { setSubmitting }: any) => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMsg(null);

		try {
			if (isEdit && token) {
				await updateApiToken({
					id: token.id,
					name: values.name,
					expiry: values.expiry === "" ? null : values.expiry,
				});
				queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
				showObjectSuccess("api-token", "saved");
				remove();
			} else {
				const created = await createApiToken({
					name: values.name,
					...(values.expiry ? { expiry: values.expiry } : {}),
				});
				queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
				showObjectSuccess("api-token", "created");
				// Switch to the reveal view instead of closing.
				setCreatedSecret(created.secret ?? null);
			}
		} catch (err: any) {
			setErrorMsg(err.message);
		} finally {
			setIsSubmitting(false);
			setSubmitting(false);
		}
	};

	const copySecret = async () => {
		if (!createdSecret) return;
		try {
			await navigator.clipboard.writeText(createdSecret);
			showSuccess(intl.formatMessage({ id: "api-token.copied" }));
		} catch {
			showError(intl.formatMessage({ id: "api-token.copy-failed" }));
		}
	};

	// Reveal view: token has been created, show the secret once.
	if (createdSecret) {
		return (
			<Modal show={visible} onHide={remove}>
				<Modal.Header closeButton>
					<Modal.Title>
						<T id="api-token.created-title" />
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Alert variant="warning">
						<T id="api-token.secret-warning" />
					</Alert>
					<div className="input-group">
						<input
							className="form-control font-monospace"
							readOnly
							value={createdSecret}
							onFocus={(e) => e.target.select()}
						/>
						<button type="button" className="btn btn-orange" onClick={copySecret}>
							<IconCopy size={16} />
							<T id="copy" />
						</button>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<Button className="ms-auto btn-orange" onClick={remove}>
						<T id="api-token.done" />
					</Button>
				</Modal.Footer>
			</Modal>
		);
	}

	return (
		<Modal show={visible} onHide={remove}>
			<Formik
				initialValues={
					{
						name: token?.name ?? "",
						// Existing tokens: keep the current expiry choice empty (unknown preset) → "never" slot.
						expiry: isEdit ? "" : "90d",
					} as any
				}
				onSubmit={onSubmit}
			>
				{() => (
					<Form>
						<Modal.Header closeButton>
							<Modal.Title>
								<T id={isEdit ? "object.edit" : "object.add"} tData={{ object: "api-token" }} />
							</Modal.Title>
						</Modal.Header>
						<Modal.Body>
							<Alert variant="danger" show={!!errorMsg} onClose={() => setErrorMsg(null)} dismissible>
								{errorMsg}
							</Alert>
							{!isEdit && (
								<p className="text-secondary">
									<T id="api-token.intro" />
								</p>
							)}
							<div className="mb-3">
								<Field name="name" validate={validateString(1, 255)}>
									{({ field, form }: any) => (
										<div className="form-floating mb-3">
											<input
												id="name"
												className={`form-control ${form.errors.name && form.touched.name ? "is-invalid" : ""}`}
												placeholder={intl.formatMessage({ id: "api-token.name" })}
												{...field}
											/>
											<label htmlFor="name">
												<T id="api-token.name" />
											</label>
											{form.errors.name && form.touched.name ? (
												<div className="invalid-feedback">{form.errors.name}</div>
											) : null}
										</div>
									)}
								</Field>
							</div>
							<div className="mb-1">
								<Field name="expiry">
									{({ field }: any) => (
										<div className="form-floating">
											<select id="expiry" className="form-select" {...field}>
												{EXPIRY_OPTIONS.map((opt) => (
													<option key={opt.labelId} value={opt.value}>
														{intl.formatMessage({ id: opt.labelId })}
													</option>
												))}
											</select>
											<label htmlFor="expiry">
												<T id="api-token.expiry" />
											</label>
										</div>
									)}
								</Field>
							</div>
						</Modal.Body>
						<Modal.Footer>
							<Button data-bs-dismiss="modal" onClick={remove} disabled={isSubmitting}>
								<T id="cancel" />
							</Button>
							<Button
								type="submit"
								className="ms-auto btn-orange"
								isLoading={isSubmitting}
								disabled={isSubmitting}
							>
								<T id={isEdit ? "save" : "api-token.create"} />
							</Button>
						</Modal.Footer>
					</Form>
				)}
			</Formik>
		</Modal>
	);
});

export { showApiTokenModal };
