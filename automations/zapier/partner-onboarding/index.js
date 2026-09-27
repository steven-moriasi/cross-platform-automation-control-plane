"use strict";

const { version: platformVersion } = require("zapier-platform-core");
const { version } = require("./package.json");
const authentication = require("./src/authentication");
const createPartnerCase = require("./src/creates/create-partner-case");
const updatePartnerStatus = require("./src/creates/update-partner-status");
const verifyPartnerDocuments = require("./src/creates/verify-partner-documents");
const {
  addAuthenticationHeader,
  mapHttpErrors,
} = require("./src/http-middleware");
const newPartnerApplication = require("./src/triggers/new-partner-application");

module.exports = {
  version,
  platformVersion,
  flags: {
    cleanInputData: false,
  },
  authentication,
  beforeRequest: [addAuthenticationHeader],
  afterResponse: [mapHttpErrors],
  triggers: {
    [newPartnerApplication.key]: newPartnerApplication,
  },
  creates: {
    [verifyPartnerDocuments.key]: verifyPartnerDocuments,
    [createPartnerCase.key]: createPartnerCase,
    [updatePartnerStatus.key]: updatePartnerStatus,
  },
};
