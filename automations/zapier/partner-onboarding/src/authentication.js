"use strict";

const test = async (z, bundle) => {
  const response = await z.request({
    method: "GET",
    url: `${bundle.authData.baseUrl}/api/v1/meta`,
  });
  return response.data;
};

module.exports = {
  type: "custom",
  fields: [
    {
      key: "baseUrl",
      label: "Synthetic Operations API URL",
      type: "string",
      required: true,
      default: "https://synthetic-operations.example.test",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      helpText:
        "Use a target-environment connection value. No credential is stored in this repository.",
    },
  ],
  test,
  connectionLabel: "{{bundle.authData.baseUrl}}",
};
