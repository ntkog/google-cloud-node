/*!
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*!
 * @module logging/metadata
 */

'use strict';

/**
 * The Metadata class attempts to contact the metadata service and determine,
 * based on request success and environment variables, what type of resource
 * the library is operating on.
 *
 * @constructor
 * @alias module:logging/metadata
 *
 * @private
 *
 * @resource [Logs Resource API Documentation]{@link https://cloud.google.com/logging/docs/api/reference/rest/v2/MonitoredResource}
 *
 * @param {module:logging} logging - The parent Logging instance.
 */
function Metadata(logging) {
  this.logging_ = logging;
}

/**
 * Create a descriptor for Cloud Functions.
 *
 * @param {string} projectId - The project ID.
 * @returns {object}
 */
Metadata.getCloudFunctionDescriptor = function(projectId) {
  return {
    type: 'cloud_function',
    labels: {
      project_id: projectId,
      function_name: process.env.FUNCTION_NAME,
      region: process.env.SUPERVISOR_REGION
    }
  };
};

/**
 * Create a descriptor for Google App Engine.
 *
 * @param {string} projectId - The project ID.
 * @returns {object}
 */
Metadata.getGAEDescriptor = function(projectId) {
  return {
    type: 'gae_app',
    labels: {
      project_id: projectId,
      module_id: process.env.GAE_SERVICE || process.env.GAE_MODULE_NAME,
      version_id: process.env.GAE_VERSION
    }
  };
};

/**
 * Create a descriptor for Google Compute Engine.
 *
 * @private
 *
 * @param {string} projectId - The project ID.
 * @return {object}
 */
Metadata.getGCEDescriptor = function(projectId) {
  return {
    type: 'gce_instance',
    labels: {
      project_id: projectId
    }
  };
};

/**
 * Create a global descriptor.
 *
 * @private
 *
 * @param {string} projectId - The project ID.
 * @returns {object}
 */
Metadata.getGlobalDescriptor = function(projectId) {
  return {
    type: 'global',
    labels: {
      project_id: projectId
    }
  };
};

/**
 * Assigns an entry with a default resource object.
 *
 * @param {object} entryJson - The entry object to assign a resource to.
 * @param {function} callback - The callback function.
 */
Metadata.prototype.assignDefaultResource = function(entryJson, callback) {
  if (entryJson.resource) {
    setImmediate(function() {
      callback(null, entryJson);
    });
    return;
  }

  this.getDefaultResource(function(err, resource) {
    if (err) {
      callback(err);
      return;
    }

    entryJson.resource = resource;

    callback(null, entryJson);
  });
};

/**
 * Retrieve a resource object describing the current environment.
 *
 * @param {function} callback - The callback function.
 */
Metadata.prototype.getDefaultResource = function(callback) {
  var self = this;

  this.getProjectId(function(err, projectId) {
    if (err) {
      callback(err);
      return;
    }

    self.logging_.authClient.getEnvironment(function(err, env) {
      var defaultResource;

      if (env.IS_APP_ENGINE) {
        defaultResource = Metadata.getGAEDescriptor(projectId);
      } else if (env.IS_CLOUD_FUNCTION) {
        defaultResource = Metadata.getCloudFunctionDescriptor(projectId);
      } else if (env.IS_COMPUTE_ENGINE) {
        defaultResource = Metadata.getGCEDescriptor(projectId);
      } else {
        defaultResource = Metadata.getGlobalDescriptor(projectId);
      }

      callback(null, defaultResource);
    });
  });
};

/**
 * Attempt to retrieve the project ID from the auth client.
 *
 * @param {function} callback - The callback function.
 */
Metadata.prototype.getProjectId = function(callback) {
  if (global.GCLOUD_SANDBOX_ENV) {
    return;
  }

  var self = this;

  if (this.logging_.projectId) {
    setImmediate(function() {
      callback(null, self.logging_.projectId);
    });
    return;
  }

  this.logging_.authClient.getProjectId(callback);
};

module.exports = Metadata;
