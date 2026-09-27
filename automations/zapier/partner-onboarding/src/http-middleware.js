"use strict";

const addAuthenticationHeader = (request, _z, bundle) => {
  request.headers = {
    ...request.headers,
    "x-synthetic-api-key": bundle.authData.apiKey,
  };
  return request;
};

const mapHttpErrors = (response, z) => {
  if (response.status === 429) {
    throw new z.errors.ThrottledError(
      "The synthetic operations API rate limit was reached.",
      5,
    );
  }
  if (response.status >= 500) {
    throw new z.errors.ThrottledError(
      `The synthetic operations API returned ${response.status}.`,
      5,
    );
  }
  response.throwForStatus();
  return response;
};

module.exports = { addAuthenticationHeader, mapHttpErrors };
