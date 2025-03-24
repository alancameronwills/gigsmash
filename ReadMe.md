# GigsMash

Collects the event listings from multiple theatres, venues and promoters and presents them in one convenient list.

Run locally:

* (First time) `npm install`
* `npm start` 

To test locally:
* `npm --test`

To install on Azure:

* Create a Functions App and put into it the contents of `/api`
* Put the contents of `/client` into a Blob store and map non-`/api` reqs to that.

