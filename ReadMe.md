# Gigiau backend

Collects the event listings from multiple theatres, venues and promoters and presents them in one convenient list.

Run locally:

* (First time) `npm install`
* `npm start` 

To test locally:
* `npm test`

To install on Azure:

* Create a Functions App and put into it the contents of `/api`
* Put the contents of `/client` into a Blob store and map non-`/api` reqs to that.

## Edit collection algorithm
`api/events/index.js`

## Run collection manually
https://pantywylan-2.azurewebsites.net/collect.html

* **Go** Runs collector in api/collect
* **Purge** Cleans the thumbnail cache
* **Tests** Runs tests in api/collect

To adjust timer, change `api/CollectOnTimer/function.json`


