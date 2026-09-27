"use strict";

const nock = require("nock");
const zapier = require("zapier-platform-core");
const App = require("..");
const caseCreatedFixture = require("../fixtures/case-created.json");

const appTester = zapier.createAppTester(App);
const authData = {
  apiKey: "synthetic-test-key",
  baseUrl: "https://synthetic-operations.example.test",
};

describe("partner onboarding integration", () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it("paginates partner applications with a stable deduplication id", async () => {
    nock(authData.baseUrl, {
      reqheaders: { "x-synthetic-api-key": authData.apiKey },
    })
      .get("/api/v1/partners/applications")
      .query({ cursor: "2", limit: "2" })
      .reply(200, {
        data: [
          {
            applicationId: "partner-application-003",
            organizationName: "Reference Assessors PLC",
            submittedAt: "2026-01-12T08:00:00.000Z",
            verificationStatus: "PENDING",
          },
        ],
      });

    const results = await appTester(
      App.triggers.new_partner_application.operation.perform,
      { authData, meta: { page: 1 } },
    );

    expect(results).toEqual([
      expect.objectContaining({
        id: "partner-application-003",
        applicationId: "partner-application-003",
      }),
    ]);
  });

  it("creates a replay-safe partner case", async () => {
    nock(authData.baseUrl, {
      reqheaders: {
        "x-idempotency-key": "zapier:partner-request-001",
        "x-synthetic-api-key": authData.apiKey,
      },
    })
      .post("/api/v1/partners/cases", {
        applicationId: "partner-application-001",
        caseId: "partner-case-001",
      })
      .reply(200, caseCreatedFixture);

    const result = await appTester(
      App.creates.create_partner_case.operation.perform,
      {
        authData,
        inputData: {
          applicationId: "partner-application-001",
          caseId: "partner-case-001",
          requestId: "partner-request-001",
        },
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        caseId: "partner-case-001",
        replayed: false,
        status: "OPEN",
      }),
    );
  });

  it("maps dependency failures to a retryable Zapier error", async () => {
    nock(authData.baseUrl)
      .post("/api/v1/partners/verifications")
      .reply(503, { message: "Synthetic transient dependency failure." });

    await expect(
      appTester(App.creates.verify_partner_documents.operation.perform, {
        authData,
        inputData: {
          applicationId: "partner-application-001",
          documentReferences: ["partner-document-001"],
          requestId: "partner-verification-001",
        },
      }),
    ).rejects.toThrow("synthetic operations API returned 503");
  });
});
