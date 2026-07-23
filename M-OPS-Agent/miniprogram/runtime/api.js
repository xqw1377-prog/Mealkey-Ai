/**
 * Runtime 对外 API
 */
const registry = require("./registry.js");
const openAgent = require("./open-agent.js");
const context = require("./context.js");
const validate = require("./validate-manifest.js");
const marketplace = require("./marketplace.js");

module.exports = {
  registerPlugins: registry.registerPlugins,
  listAgents: registry.listAgents,
  resolve: registry.resolve,
  openAgent: openAgent.openAgent,
  injectContext: context.injectContext,
  validateManifest: validate.validateManifest,
  fetchMarketplace: marketplace.fetchMarketplace,
  loadLocalMarketplaceJson: marketplace.loadLocalMarketplaceJson,
  getRemoteListings: marketplace.getRemoteListings,
};
