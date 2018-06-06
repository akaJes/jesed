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
var tinySession;
      function changeName() {
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
      }
      function initGitVersion(ui, editor) {
        ui.find('button.btn-primary').on('click', function(ev) {
          var row = ui.find('.table-success');
          if(row.length) {
            var branch = row.attr('hash');
            $.get({url: services + 'git' + editor.session.path, data: {branch: branch}})
            .catch(function() { return ' '})
            .then(function(dataGit) {
              delete editor.$setBaseText; //TODO: set option to session
              editor.setOptions({setBaseText: dataGit})
              editor.getSession()._signal("changeAnnotation", {}); //TODO: bug update
              ui.modal('hide');
            });
          }
        });
        ui.find('table tbody').on('click',function(ev) {
          $(this).find('tr').removeClass('table-success');
          $(ev.target).parents('tr').addClass('table-success')
        });
        function open() {
          $.get({url: services + 'git' + editor.session.path, data: {list: 1}})
          .then(function(data) {
            var b = ui.find('tbody').empty();
            function td(val) { return ['<td class="ellipsis" title="', val, '">', val, '</td>'].join('') }
            data.all.map(function(i) {
              b.append(['<tr hash="', i.hash, '">', td(i.date), td(i.author_name), td(i.message), '</tr>'].join(''))
            })
            ui.modal()
          });
        }
        return open;
      }
      function addSelectionBeautify(editor) {
        function beautify(editor) {
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
        }
        var beautifyCmd = {
	        name: "beautify",
	        exec: function(editor) {
				    beautify(editor);
	        },
	        bindKey: {win: "Ctrl-Alt-f", mac: "Command-Alt-f"}
		    };
	      editor.commands.addCommand(beautifyCmd);
      }
      function createToolbar(element, tree, editor) {
        var base = element;
        function button(name, cls, title, fn) {
          $(base).append($('<button>').addClass('btn btn-sm').addClass(cls || 'm-1').html(name).on('click', fn).attr('title', title));
        }
        function addToggleButton(name, cls, title, fn) {
          $(element).append($('<button type="button" class="btn btn-sm m-1" data-toggle="button" aria-pressed="false" autocomplete="off">')
            .addClass(cls).html(name).on('click', fn).attr('title', title).attr('aria-pressed', cls.indexOf('active') >= 0));
        }
//        addButton('Save',function(e){ editor.execCommand("saveCommand") });
        addToggleButton('<i class="fas fa-save"></i>', 'btn-info active', 'Disable auto save', function() { otI.setAutoSave(!$(this).hasClass('active')); });

        var gitVersions = initGitVersion($('.jesed-gitlog-modal'), editor);
        base = $('<div class="btn-group m-1">').appendTo(element);
        button('<i class="fab fa-git"></i>', 'btn-info', 'Select base version', gitVersions);
        button('<i class="fas fa-chevron-down"></i>','btn-secondary', 'Seek for next diff', function(e){ editor.execCommand("nextDiff") });
        button('<i class="fas fa-chevron-up"></i>', 'btn-secondary', 'Seek for previous diff', function(e){ editor.execCommand("prevDiff") });
        base = element;

        addSelectionBeautify(editor);
        button('<i class="fas fa-code"></i>', '', 'Beautify selected JS code', function(e) { editor.execCommand("beautify"); });
        $("#tinymce-tab").find('button').on('click', function(){
          $(this).parents('li').hide()
          $('#preview-tab').tab('show')
        });
        button('<i class="fas fa-font"></i>', 'btn-primary', 'RichText HTML edit (be carefull with plain text !!!)', function(e) {
          tinySession = editor.session;
          tinyMCE.activeEditor.setContent(tinySession.getValue());
          $("#tinymce-tab").tab('show').parent().show();
        });
        button('<i class="fas fa-undo"></i>', '', 'Undo', function(e){ editor.getSession().getUndoManager().undo(false); });
        base = $('<div class="btn-group m-1">').appendTo(element);
        button('<i class="fas fa-keyboard"></i>', 'btn-light', 'Keyboard shortcuts', function(e) {
          ace.config.loadModule("ace/ext/keybinding_menu", function(module) {
            module.init(editor);
            editor.showKeyboardShortcuts();
          });
        });
        button('<i class="fas fa-wrench"></i>', 'btn-light', 'Editor options', function(e) {
          ace.config.loadModule("ace/ext/settings_menu", function(module) {
              module.init(editor);
              editor.showSettingsMenu();
          });
        });
        button('<i class="fas fa-user"></i>', 'btn-secondary', 'Set Your name for collaborative editing', changeName);
        base = element;
        addToggleButton('<i class="fas fa-file-alt"></i>','btn-info jesed-scroll','Keep scrolling down',
          function() {
            var ob = manager[editor.session.path];
            ob.scrollDown = !ob.scrollDown;
          });
        $(element).append(state = $(' <span class="m-1">Loading...</span>'));
      }
      function syncToggleButtons(editor) {
        var ob = manager[editor.session.path];
        if (!!ob.scrollDown != $('.jesed-scroll').hasClass('active'))
          $('.jesed-scroll').button('toggle')
      }
      var manager = {};     // {path, tab, name, session}
      function createTree(element, editor) {
        fsbrowser($('.tree'), services, loadFile)
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
            if (['image', 'audio', 'video'].indexOf(ob.mime.split('/')[0]) >= 0)
              loadPreview(services + 'file' + ob.id, ob.mime);
        }
        function loadEditor(path) {
          var s = manager[path];
          if (!s) {
            var name = path.slice(path.lastIndexOf("/") + 1);
            var tab = $('<li class="nav-item" style="white-space: nowrap;"><a class="nav-link" data-toggle="tab" href="#editorTab" role="tab" aria-controls="profile" aria-selected="false">'
              + '<button class="close closeTab pl-2" type="button" >×</button>' + name + ' <span class="badge badge-info"></span></a></li>');
            $('ul.nav').append(tab);
            s = manager[path] = {
              tab: tab,
              path: path,
              name: name,
              session: ace.createEditSession(''),
              isActive: function() { return !!s.tab.find('[aria-selected=true]').length; },
            }
            s.session.path = path;
            s.session.setUseSoftTabs(true);
            s.session.setTabSize(2);
            //switch
            tab.find('a').on('shown.bs.tab', function(ev) {
              state.text(s.state || '');
              $(this).find('span').text('');
              editor.setSession(s.session);
              editor.setReadOnly(s.disconnected);
              editor.dmp && editor.dmp.scan();
              if (s.session.getMode().$id == "ace/mode/javascript") {
                var w = s.session.$worker;
                w && w.send("changeOptions", [{
                  asi: true,    //supress semicolon warning
                  maxerr: 1000, //supress Too many errors
                }]);
              }
              editor.focus();
              syncToggleButtons(editor);
              if (s.scrollDown)
                editor.gotoLine(Infinity);
              $('.jesed-grep-on').prop('checked') &&
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
        function loadPreview(path, mime) {
          $('#preview-tab').tab('show')
          var style = ' style="max-width:100%; max-height:100%; margin:auto; display:block;" ';
          var html = '<img src="'+path+'"' + style + '/>';
          var type = mime.split('/')[0];
          if (type == 'video')
            html = '<video width="100%"' + style + ' controls><source src="' + path + '" type="' + mime + '">Your browser does not support HTML5 video.</video>';
          if (type == 'audio')
            html = '<audio ' + style + ' controls><source src="' + path + '" type="' + mime + '">Your browser does not support the audio element.</audio>';
          $('#previewTab').html(html);
        }
        return this;
      }

      function createEditor(element, file, lang, theme, type){
        var editor = ace.edit(element);
        require('ace/ext/beautify');
        require("ace/ext/language_tools");
        editor.setOptions({
          enableBasicAutocompletion: true,
          enableSnippets: true,
          enableLiveAutocompletion: !false
        });
        var MT = require("marker_tooltip");
        new MT(editor)
        require('diff');
        var OT = require("ot");
        otI = new OT(manager, function(text, docId) {
          if (text == 'offline')
            editor.setReadOnly(true);
          if (text == 'online')
            editor.setReadOnly(false);
          if (text == 'change') {
            var ob = manager[docId];
            if (ob && !ob.isActive())
              ob.tab.find('span').text(parseInt(ob.tab.find('span').text() || 0) + 1)
            if (ob && ob.isActive() && ob.scrollDown)
                editor.gotoLine(Infinity);
            return
          }
          if (text == 'changed') {
            if (tinySession == editor.session)
              tinyMCE.activeEditor.setContent(tinySession.getValue());
            return
          }
          state.text(text)
        });
        otI.socket.on('files', function (type, docId) {
          if (type == 'unlink') {
            var ob = manager[docId];
            if (ob) {
              ob.disconnected = true;
              if(ob.isActive()) {
                editor.setReadOnly(true);
                state.text('removed')
              }
            }
          }
          var p = docId.split('/').slice(0, -1).join('/') || '/';
          $('.tree').jstree().refresh_node(p);
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
          $.when(0 && $.get(services + 'file' + theUrl), $.get(services + 'git' + theUrl).catch(function(){ return [' ']}), otI.init(theUrl, token, myName))
          .then(function(data, dataGit){
            delete editor.$setBaseText; //TODO: set option to session
            editor.setOptions({setBaseText: dataGit[0] })
if(0)
            editor.setValue(data[0]);
            var path = location.hash.split('#'), pos = (path[2] || '').split(',');
            if (path[1] == editor.session.path)
              setTimeout(function() {editor.gotoLine(pos[0], pos[1]); }, 1000);
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
          var modelist = ace.require("ace/ext/modelist")
          var mode = modelist.getModeForPath(file).mode
          editor.session.setMode(mode)
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
    createToolbar(".uploader", tree, editor);
    $.ajax('s/version')
    .then(function(data) {
      $('.jesed-version').text(data)
    });

    var tinyDB = debounce(function (ed) {
      tinySession && tinySession.doc.setValue(ed.getContent());
    }, 1000);
    tinymce.init({
        selector: "#tinymce",
        theme: "modern",
        height: '100%',
        plugins: [
            "advlist autolink link image lists charmap print preview hr anchor pagebreak spellchecker",
            "searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking",
            "save table contextmenu directionality emoticons template paste textcolor"
       ],
//       content_css: "css/content.css",
       toolbar: "insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | print preview media fullpage | forecolor backcolor emoticons | code", 
       style_formats: [
            {title: 'Bold text', inline: 'b'},
            {title: 'Red text', inline: 'span', styles: {color: '#ff0000'}},
            {title: 'Red header', block: 'h1', styles: {color: '#ff0000'}},
            {title: 'Example 1', inline: 'span', classes: 'example1'},
            {title: 'Example 2', inline: 'span', classes: 'example2'},
            {title: 'Table styles'},
            {title: 'Table row 1', selector: 'tr', classes: 'tablerow1'}
        ],
        setup: function(ed) {
          ed.on('change', function(e) {
            tinyDB(ed);
          });
        },
    });
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
