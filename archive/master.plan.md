We're building an end-to-end workflow that allows streamlining publishing of the digital assets I create in Blender to be published to my customers and subscribers.

This workflow includes 5 import sections:

1. Blender Add-on (90 percent completed already) that allows me to quickly export assets with metadata in a .json file to the github repo. Thats found here. @send-no3ds-export utility 

2. Github Repo that hosts the product listings, files and media as a synced database - stored locally at
'/Users/joebowers/Library/CloudStorage/Dropbox/Caveman Creative/THE WELL_Digital Assets/Product Listing Management/The Well Product Catalog/no3d-tools-library'
github https://github.com/node-dojo/no3d-tools-library

every folder is one product.

every folder has:

-downlaod files as .blend files
-media files (images, videos, gifs)
-product desciption markdown document
-metadata as .json file

this folder structure informs how the product listings are pushed to multiple potential ecommerce platforms. But for now we're just concerned with the new website we're creating with is using polar as its custom payment processor/customer management tool.

3. Ecommerce website catalog that makes navigating a lsit of 50 - 200 digital assets intuitive clean and useful. the website should serve as a library of information of each digital asset as much as it should be for shopping the catalog. Here is the design format.
![Design Format](./Screenshot%202025-10-27%20at%204.54.55%20PM.png)

framework is next.js/react via vercel possibly.

Design should be extremely minimal. Visitor font used for all headers. Silka mono used for all body/paragraph fonts. Black and white theme except for #f0ff00 used as accents.
We'll use figma mcp to develop and define the design in detail. And a style guide will be generated in the code base to be enforced.

4. Polar integration to;
-manage payments
-checkout process
-custom accounts
-host the download files to be accessed

5. github actions to:
-push content from repo to website
-push  content to polar as products
-generate "product bundles" based on mapping metadata tags etc.
-push product bundles to website and polar and make sure these are all synced together

these actions should be triggered by schedules and manually when