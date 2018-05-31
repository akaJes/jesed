## Online collaborative editor
### Features
* file browser (create, copy, rename, delete, download, upload and preview)
* tabs for opened files
* instant files saving and watching for changes
* visual diff for repository enabled projects (git)
* marking of events for shared users actions (cursor, selection, edition)
* user authentification per every project
* auto update from configuration files your projects and passwords

used the best multifunction web editor [ACE](https://ace.c9.io/) ever

the [GIT](https://git-scm.com/) is strongly recomended to install as dependency
### Binary installation
just download https://github.com/akaJes/jesed/releases to some project folder(with git) and run
### NPM installation
`sudo npm i -g jesed` choose some project folder(with git) and type `jesed`
### Startup local
enter your credentials and open http://localhost:3000/ (do not close application)
#### Type for help
`jesed --help`
#### Create new User
`jesed user add me`
#### Add/modify projects
Modify the `projects.json` for your desire with your favorite editor
#### For use with Apache webserver as PM2 service
```
jesed config
sudo ./apache
```
open in your browser http://your-domain/jesed/ link

#### Troubleshooting
* for `ENOSPC` error - extend max watches amount
`echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p`
