## Online collaborative editor
### Features
* file browser (create, copy, rename, delete, download, upload and preview)
* tabs for opened files
* visual diff for repository enabled projects
* marking of events for shared users actions (cursor, selection, edition)
* user authentification per every project

### Installation
```
mkdir jesed
cd jesed
npm i jesed
sudo npm -g i npm
npm run rebuild-ot
```
#### Create passwords file
`htdigest -c .htdigest Users me`
#### Add other users
`htdigest .htdigest Users anotherme`
#### Create base projects config
`cp projects.json.dist projects.json`
#### For local use
rename `config.mode` variable in package.json to `local`
#### For use with apache
```
cd config
sudo ./apache
```
### Run as service
```
sudo npm i -g pm2
sudo pm2 start package.json
```
