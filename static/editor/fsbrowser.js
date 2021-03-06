function fsbrowser(ui, services, cb) {
    var upload = $('<input type="file" name="data" style="display: none;">');
    var download = $('<iframe style="display:none;"></iframe>');
    var path;
    upload.on('change', function(ev) {
      if (this.files.length && path) {
        var form = new FormData();
        form.append("data", this.files[0], this.files[0].name);
        $.ajax({url: services + 'upload' + path + '/' + this.files[0].name, type: 'POST', data: form, contentType: false, processData: false})
        .then(function(data) {
          ui.jstree('refresh');
        })
        .fail(function(data) {
            alert("ERROR["+data.status+"]: "+data.responseText);
        });
       }
    })
    ui.after(upload);
    ui.after(download);
    function filterRow(row) {
      return row.changed && Object.assign(row, {a_attr: {style: 'color:red'}}) || row;
    }
    var changed, grep;
    $('.jesed-changed').on('click', function() {
      changed = $(this).hasClass('active') ? undefined : 0;
      ui.jstree('refresh');
    })
    $('.jesed-grep').on('change', function() {
      var v = $(this).val();
      if (v.length > 3) {
        $('.jesed-grep-on').prop('checked', true);
        grep = v;
        ui.jstree('refresh');
        addHistory(v);
      }
    })
    function addHistory(v) {
        var h = $('.jesed-grep-history')
        h.find('a').each(function(i){ ($(this).text() == v || i > 5) && $(this).remove()})
        h.prepend('<a class="dropdown-item" href="#">' + v + '</a>');
        store('grep','history', h.find('a').map(function(i){ return $(this).text() }).get())
    }
    (store('grep','history') || []).map(function(v) {
      addHistory(v);
    })
    $('.jesed-grep-history').on('click', 'a', function() {
      $('.jesed-grep').val($(this).text()).trigger('change');
    })
    $('.jesed-grep-on').on('change', function() {
      if ($(this).prop('checked'))
        $('.jesed-grep').trigger('change');
      else {
        grep = undefined
        ui.jstree('refresh');
      }
    });
	ui.jstree({
		'core' : {
            data : function (node, cb) {
              $.ajax({url: services + 'tree', data:{id: node.id, c: changed, g: grep}})
              .then(function (data) {
                if(data.children)
                   data.children = data.children.map(filterRow);
                else
                   data = data.map(filterRow);
                cb(data);//[{ "id" : data.id, "text" : data.name }])
              });
            },
			'check_callback' : function(o, n, p, i, m) {
			    if(m && m.dnd && m.pos !== 'i') { return false; }
			    if(o === "move_node" || o === "copy_node") {
				if(this.get_node(n).parent === this.get_node(p).id) { return false; }
			    }
			    return true;
			},
			'force_text' : true,
			'themes' : {
			    'responsive' : false,
			    'variant' : 'small',
			    'stripes' : true
			}
		},
		'sort' : function(a, b) {
			return this.get_type(a) === this.get_type(b) ? (this.get_text(a) > this.get_text(b) ? 1 : -1) : (this.get_type(a) >= this.get_type(b) ? 1 : -1);
		},
		'contextmenu' : {
			'items' : function(node) {
			    var tmp = $.jstree.defaults.contextmenu.items();
			    delete tmp.create.action;
                function action(params) {
                  return function (data) {
					var inst = $.jstree.reference(data.reference);
					var obj = inst.get_node(data.reference);
					inst.create_node(obj, params, "last", function (new_node) {
					    setTimeout(function () { inst.edit(new_node); },0);
					});
				  }
                }
			    if(this.get_type(node) === "default") {
			      tmp.create.label = "New";
			      tmp.create.submenu = {
				    "create_folder" : {
				      "separator_after"	: true,
				      "label"				: "Folder",
				      "action"			: action({type : "default", icon: 'jstree-folder'}),
				    },
				    "create_file" : {
				      "label"				: "File",
				      "action"			: action({type : "file", icon: 'jstree-file', mime: 'text/plain'}),
				    }
			      };
                  if (node.state.opened) {
                    tmp["Collapse"] = {
                      label: "Collapse",
                      action: function(e) { ui.jstree('close_node', node.id); }
                    };
                    tmp["Refresh"] = {
                      label: "Refresh",
                      action: function(e) { ui.jstree('refresh_node', node.id); }
                    };
                  } else {
                    tmp["Expand"] = {
                      label: "Expand",
                      action: function(e) { ui.jstree('open_node', node.id); }
                    };
                  }
                  tmp["Upload"] = {
                    label: "Upload",
                    action: function(e) { path = node.id; upload.trigger('click'); }
                  };

                } else {
                  tmp["Download"] = {
                    label: "Download",
                    action: function(e) { download.attr('src', services + 'file' + node.id);}
                  };
                }
			    return tmp;
			}
		},
		'types' : {
			'default' : { 'icon' : 'jstree-folder' },
			'file' : { 'valid_children' : [], 'icon' : 'jstree-file' }
		},
		'unique' : {
			'duplicate' : function (name, counter) {
			    return name + ' ' + counter;
			}
		},
		'plugins' : ['state','dnd','sort','types','contextmenu','unique']
	})
	.on('delete_node.jstree', function (e, data) {
		    $.ajax({url: services + 'file' + data.node.id, method: 'delete'})
			.fail(function () {
			    data.instance.refresh();
			});
	})
	.on('rename_node.jstree', function (e, data) {
            (/\//.test(data.node.id)
            && $.ajax({method: 'put', url: services + 'file' + data.node.id, data: {to: data.node.parent + '/' + data.text}})
            || $.post(services + 'file' + data.node.parent + '/' + data.node.text, {type: data.node.type})
            )
			.done(function (d) {
			    data.instance.set_id(data.node, d.id);
                data.node.original.id = d.id;
			})
			.fail(function () {
			    data.instance.refresh();
			});
	})
	.on('move_node.jstree', function (e, data) {
            $.ajax({method: 'put', url: services + 'file' + data.node.id, data: {to: data.parent + '/' + data.node.text}})
			.done(function (d) {
			    //data.instance.load_node(data.parent);
			    data.instance.refresh();
			})
			.fail(function () {
			    data.instance.refresh();
			});
	})
	.on('copy_node.jstree', function (e, data) {
            $.ajax({method: 'put', url: services + 'copy' + data.original.id, data: {to: data.parent + '/' + data.node.text}})
			.done(function (d) {
			    //data.instance.load_node(data.parent);
			    data.instance.refresh();
			})
			.fail(function () {
			    data.instance.refresh();
			});
	})
	.on('changed.jstree', function (e, data) {
		if(data && data.selected && data.selected.length) {
            var name = data.selected.join(':');
            return cb(data.node.original);
		}
	})
    .on('ready.jstree', function () {
      var path = location.hash.split('#')[1], open = [path];
      if (path) {
        while (open[open.length - 1].length)
          open.push(open[open.length - 1].split('/').slice(0, -1).join('/'))
        ui.jstree().set_state({core: {selected: [path], open: open }});
      }
    })
}