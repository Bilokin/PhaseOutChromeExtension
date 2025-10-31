// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason == chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.runtime.openOptionsPage();
  }
  
});

chrome.action.onClicked.addListener(async (tab) => {
  // Get the URL for the weights folder

  // Generate a URL for a web-accessible resource
  const imagesResourceUrl = chrome.runtime.getURL("images/");
  const weightsResourceUrl = chrome.runtime.getURL("weights/");



  await chrome.userScripts.register([
    {
      id: 'constants',
      matches: ['<all_urls>'],
      js: [{ code: `const IMAGES_URL = "${imagesResourceUrl}";
                    const WEIGHTS_URL = "${weightsResourceUrl}";` }]
    },
    {
      id: 'face-api',
      matches: ['<all_urls>'],
      js: [{ file: 'face-api.min.js' }]
    },
    {
      id: 'weights-script',
      matches: ['<all_urls>'],
      js: [{ file: 'weights_base64.js' }]
    },
    {
      id: 'user-script',
      matches: ['<all_urls>'],
      js: [{ file: 'user_script.js' }]
    }
  ]);

});
