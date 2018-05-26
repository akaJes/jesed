## Online collaborative editor
### Features
* file browser (create, copy, rename, delete, download, upload and preview)
* tabs for opened files
* instant files saving and watching for changes
* visual diff for repository enabled projects (git)
* marking of events for shared users actions (cursor, selection, edition)
* user authentification per every project

used the best multifunction web editor [ACE](https://ace.c9.io/) ever

the [GIT](https://git-scm.com/) is strongly recomended to install as dependency
### Binary installation
download https://github.com/akaJes/jesed/releases and run

enter your credentials and open http://localhost:3000/
### NPM installation
```
mkdir jesed ; cd jesed
npm i jesed
./jesed
```
enter your credentials and open http://localhost:3000/

#### Create new User
`./jesed user add me`
#### Add/modify projects
Run single time `./jesed` for project startup file creation
Modify the `projects.json` for your desire and restart service `sudo pm2 restart jesed`
#### For local use
`./jesed serve`
#### For use with apache as service
```
sudo npm i -g pm2
sudo pm2 start package.json
cd config
sudo ./apache
```
open your domain url with /jesed/