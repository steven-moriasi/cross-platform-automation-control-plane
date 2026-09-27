"use strict";

const perform = async (z, bundle) => {
  const page = bundle.meta.page ?? 0;
  const limit = 2;
  const response = await z.request({
    method: "GET",
    url: `${bundle.authData.baseUrl}/api/v1/partners/applications`,
    params: {
      cursor: String(page * limit),
      limit: String(limit),
    },
  });
  return response.data.data.map((application) => ({
    id: application.applicationId,
    ...application,
  }));
};

module.exports = {
  key: "new_partner_application",
  noun: "Partner Application",
  display: {
    label: "New Partner Application",
    description: "Triggers when a synthetic partner application is available.",
  },
  operation: {
    canPaginate: true,
    perform,
    sample: {
      id: "partner-application-001",
      applicationId: "partner-application-001",
      organizationName: "Synthetic Logistics Limited",
      submittedAt: "2026-01-10T08:00:00.000Z",
      verificationStatus: "PENDING",
    },
    outputFields: [
      { key: "id", label: "Deduplication ID" },
      { key: "applicationId", label: "Application ID" },
      { key: "organizationName", label: "Organization Name" },
      { key: "submittedAt", label: "Submitted At", type: "datetime" },
      { key: "verificationStatus", label: "Verification Status" },
    ],
  },
};
