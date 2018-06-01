var services = 's/editor/';
var myName, token;
var config;
$(function(){
  config = $.ajax(services).then(function(o) {
    myName = o.name;
    token = o.token.token;
    return o;
  })
})
var otI;
var state;
      function createFileUploader(element, tree, editor) {
        function addButton(name, fn, title) {
          $(element).append($('<button>').addClass('btn btn-sm m-1').html(name).on('click', fn).attr('title', title));
        }
//        addButton('<<',function(e){ $('.jstree').toggle(); });
//        addButton('A',function(e){ toggleFullScreen(); });
//        addButton('Save',function(e){ editor.execCommand("saveCommand") });
        $(element).append(
          $('<button type="button" class="btn btn-sm btn-primary active" data-toggle="button" aria-pressed="false" autocomplete="off"><i class="fas fa-save"></i></button>')
          .on('click', function() {
            otI.setAutoSave(!$(this).hasClass('active'));
          })
          .attr('title', 'disable auto save')
        );
        addButton('<i class="fas fa-chevron-down"></i>',function(e){ editor.execCommand("nextDiff") }, 'seek for next diff');
        addButton('<i class="fas fa-chevron-up"></i>',function(e){ editor.execCommand("prevDiff") }, 'seek for previous diff');
        addButton('<i class="fas fa-code"></i>', function(e) {
          if (!editor.getSelectedText()) return;
          var beautify = ace.require("ace/ext/beautify"); // get reference to extension
          var session = ace.createEditSession('', editor.session.getOption('mode'));
          session.setTabSize(editor.session.getTabSize());
//          var sel = editor.session.getSelection();
          var range = editor.selection.getRange();
          range.start.column = 0;
          range.end.column = undefined;
          var val = editor.session.doc.getTextRange(range);
          session.setValue(val);
          beautify.beautify(session);
          var b = session.getValue();
          var space = val.match(/^\s+/);
          if (space)
            b = b.split(/\r\n?|\n/).map(function(line){ return space[0] + line;}).join('\n');
          editor.session.doc.replace(range, b);
          editor._signal("change", {});
        }, 'beauitify JS code');
        myName ||
        addButton('<i class="fas fa-user"></i>',function(e){
          if(isElectron()) {
            var d = vex.dialog.prompt({
              message: 'Tell Ur Name!!!',
              placeholder: 'name',
              callback: function (value) {
                if(value)
                  otI.setName(myName = value);
              }
            })
            $(d.contentEl).find('input').val(myName);
          } else {
            var value = prompt('Tell Ur Name!!!', myName);
            if(value)
              otI.setName(myName = value);
          }
        }, 'set Your name for collaborative editing');
        addButton('<i class="fas fa-undo"></i>',function(e){ editor.getSession().getUndoManager().undo(false); }, 'undo');
        $(element).append(state = $('<span class="m-1">Loading...</span>'));
      }

      var manager = {};     // {path, tab, name, session}
      function createTree(element, editor) {
        fsbrowser($('.tree'), loadFile)
        function canEdit(mime) {
          var m = mime.split('/');
          return  m[0] == 'text' || m[0] == 'application' 
            && ['xml', 'sql', 'json', 'javascript', 'atom+xml', 'soap+xml', 'xhtml+xml', 'xml-dtd', 'xop+xml' ].indexOf(m[1]) >= 0;
        }
        function loadFile(ob) {
          if (ob.type == 'file')
            if(canEdit(ob.mime))
              loadEditor(ob.id);
            else
            if (ob.mime.split('/')[0] == 'image')
              loadPreview(services + 'file' + ob.id);
        };
        function loadEditor(path) {
          var s = manager[path];
          if (!s) {
            var name = path.slice(path.lastIndexOf("/") + 1);
            var tab = $('<li class="nav-item"><a class="nav-link" data-toggle="tab" href="#editorTab" role="tab" aria-controls="profile" aria-selected="false">'
              + '<button class="close closeTab pl-2" type="button" >×</button>' + name + '</a></li>');
            $('ul.nav').append(tab);
            s = manager[path] = {
              tab: tab,
              path: path,
              name: name,
              session: ace.createEditSession('', 'ace/mode/' + getLangFromFilename(name)),
            }
            s.session.path = path;
            s.session.setUseSoftTabs(true);
            s.session.setTabSize(2);
            //switch
            tab.find('a').on('shown.bs.tab', function(ev) {
              state.text('');
              editor.setSession(s.session);
              editor.setReadOnly(s.session.disconnected);
              editor.dmp && editor.dmp.scan();
              editor.focus();
              $('.jesed-grepon').prop('checked') &&
              ace.config.loadModule("ace/ext/searchbox", function(m) {
                m.Search(editor);
                var sb = editor.searchBox
                sb.searchInput.value = $('.jesed-grep').val();
                sb.regExpOption.checked = true;
                sb.$syncOptions()
                sb.find(true, false);
              })
            }).tab('show');
            //close
            tab.find('button').on('click', function(ev) {
              ev.preventDefault();
              ev.stopPropagation();
              if( $(this).parent().is('[aria-selected=true]'))
                $('#preview-tab').tab('show')
              $(this).parent().remove();
              otI.shut(path);
              delete manager[path];
            })
            editor.setSession(s.session);
            editor.loadUrl(path);
          } else {
            s.tab.find('a').tab('show')
          }
        }
        function loadPreview(path){
          $('#preview-tab').tab('show')
          $('#previewTab').html('<img src="'+path+'" style="max-width:100%; max-height:100%; margin:auto; display:block;" />');
        }
        return this;
      }
        function getLangFromFilename(filename) {
          var lang = "text";
          var ext = (/(?:\.([^.]+))?$/.exec(filename)[1]||'').toLowerCase();;
          if(typeof ext !== undefined){
            switch(ext){
              case "txt": lang = "text"; break;
              case "htm": lang = "html"; break;
              case "md": lang = "markdown"; break;
              case "js": lang = "javascript"; break;
              case "c":case "h": lang = "c_cpp"; break;
              case "cpp":case "hpp": lang = "c_cpp"; break;
              case "css":
              case "scss":
              case "php":
              case "html":
              case "json":
              case "xml":
                lang = ext;
            }
          }
          return lang;
        }

      function createEditor(element, file, lang, theme, type){
        var editor = ace.edit(element);
        require('ace/ext/beautify');
        var MT = require("marker_tooltip");
        new MT(editor)
        require('diff');
        var OT = require("ot");
        otI = new OT(manager, function(text) {
          if (text == 'torn')
            editor.setReadOnly(true);
          state.text(text)
        });
        otI.socket.on('users', function(users) {
          var u = $('.jesed-users .dropdown-menu').empty();
          var len = Object.keys(users).map(function(i) {
            u.append('<a class="dropdown-item" href="#"> ' + users[i].auth + ' (' + users[i].ip +')</a>')
          })
          u.parent().find('button span').text(len.length);
        });
        $('.jesed-invite').on('click', function(){
          $.get('s/auth')
          .then(function(invite) {
            var cp = editor.getCursorPosition();
            prompt('invite url', location.origin + location.pathname + '?invite=' + invite + '#' + editor.session.path + '#' + [cp.row + 1, cp.column]);
          })
        })
        0 && config.then(function(data){
          otI.setName(data.name);
        })
        function httpPost(filename, data, type) {
          return //disabled
          var formData = new FormData();
          formData.append("data", new Blob([data], { type: type }), filename);
          $.post({url: services + 'upload' + filename, data: formData, contentType: false, processData: false})
          .then(function(data) {
            state.text('saved!');
          },function(data){
            alert("ERROR["+data.status+"]: "+data.responseText);
          });
        }
        function httpGet(theUrl) {
          $.when(0 && $.get(services + 'file' + theUrl), $.get(services + 'git' + theUrl, otI.init(theUrl, token, myName)).catch(function(){ return [' ']}))
          .then(function(data, dataGit){
            delete editor.$setBaseText; //TODO: set option to session
            editor.setOptions({setBaseText: dataGit[0] })
if(0)
            editor.setValue(data[0]);
            var path = location.hash.split('#'), pos = (path[2] || '').split(',');
            if (path[1] == editor.session.path)
              editor.gotoLine(pos[0], pos[1]);
            else
              editor.gotoLine(0);
            editor.getSession()._signal("changeAnnotation", {}); //TODO: bug update
            state.text('opened!');
          },function(data){
            editor.setValue("");
            alert("ERROR["+data.status+"]: "+data.responseText);
          });
        }

        theme = theme || "textmate";
        editor.setTheme("ace/theme/"+theme);
        editor.$blockScrolling = Infinity;
        editor.getSession().setUseSoftTabs(true);
        editor.getSession().setTabSize(2);
        editor.setHighlightActiveLine(true);
        editor.setShowPrintMargin(false);

        editor.commands.addCommand({
            name: 'saveCommand',
            bindKey: {win: 'Ctrl-S',  mac: 'Command-S'},
            exec: function(editor) {
              httpPost(editor.session.path, editor.getValue(), type);
            },
            readOnly: false
        });
        editor.loadUrl = function(file, lang, type) {
          if(typeof file === "undefined") return file = "/index.htm";
          if(typeof lang === "undefined")
            lang = getLangFromFilename(file);
          if(typeof type === "undefined"){
            type = "text/"+lang;
            if(lang === "c_cpp") type = "text/plain";
          }
          if(lang !== "plain") editor.getSession().setMode("ace/mode/"+lang);
          httpGet(file);
        }
        editor.loadUrl(file, lang, type);
        return editor;
      }

$(function(){
//        $(window).on('beforeunload',function() { return "Realy?"; });
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) { vars[key] = value; });
        var editor = createEditor("editor", vars.file, vars.lang, vars.theme);
        var tree = createTree("tree", editor);
        createFileUploader(".uploader", tree, editor);
    0 &&
    $.ajax('/upnp/check')
    .then(function(data) {
      if(data && data[0]) {
        $('.btn-warning').show().on('click',function() {
          var url='http://' + data[0].ip + ':' + data[0].port + '/editor';
          var m=$('#mct-qr-modal');
          m.find('.modal-body img').attr('src','/qr/'+encodeURI(btoa(url)))
          m.modal();
        })
      }
    })
});
