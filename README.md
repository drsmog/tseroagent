# Tsero Agent
## Lightweight Continuous Deployment System

# Internal Commands
```
'unzip'
'deldir'
'zip'
'gitclone'
```
# Usage
setupd your config file (tseroconfig.json)
run
```
node agent.js
```



# Sample Config - tseroconfig.json
All you need to do is to describe command array with simple objects.
```
{

    "commands": [{
        "cwd": "C:/Windows/System32/inetsrv",
        "cmds": [
            "appcmd stop site todo_tsero",
            "appcmd stop apppool todo_tsero"
        ]
    }, {
        "cwd": "C:/projects/ngrxtodo",
        "cmds": [
            "$tsero deldir C:/projects/ngrxtodo",
            "$tsero deldir C:/inetpub/todo_tsero",
            "$tsero gitclone https://github.com/drsmog/ngrxtodo.git C:/projects/ngrxtodo",
            "git pull origin master",
            "npm install"
        ]
    }, {
        "cwd": "C:/projects/ngrxtodo/public/todoapp",
        "cmds": [
            "npm install",
            "ng build"
        ]
    }, {
        "cwd": "C:/projects/ngrxtodo",
        "cmds": [
            "$tsero zip C:/projects/ngrxtodo C:/inetpub/todo_tsero/example.zip ignore.json",
            "$tsero unzip C:/inetpub/todo_tsero/example.zip C:/inetpub/todo_tsero"
        ]
    }, {
        "cwd": "C:/Windows/System32/inetsrv",
        "cmds": [
            "appcmd.exe list apppool",
            "appcmd start apppool todo_tsero",
            "appcmd start site todo_tsero"
        ]
    }]
}
```
