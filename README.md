## Online collaborative editor
### Features
* file browser (create, copy, rename, delete, download, upload and preview)
* tabs for opened files
* visual diff for repository enabled projects
* marking of events for shared users actions (cursor, selection, edition)
* user authentification per every project

### Installation
`npm i jesed`
#### Create passwords file
`htdigest -c .htdigest User me`
#### Add other users
`htdigest .htdigest User anotherme`
#### Create base projects config
`cp projects.json.dist projects.json`
#### For local use
rename in package.json `config` -> `configApache` and `configLocal` -> `config`
#### For use with apache
install script from ./config/apache folder
### Run as service
```
sudo npm i -g pm2
sudo pm2 start package.json
```
