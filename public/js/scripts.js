var pageX;
var pageY;
var repoURL;
var enableIssueSubmission;

var Route = function (pattern, route) {
    this.pattern = pattern;
    this.route = route;
};

var Router = function () {
    var self = this;

    self.routes = [];

    self.add = function(pattern, route) {
        self.routes.push(new Route(pattern, route));
    };

    self.flush = function () {};

    self.route = function () {
        var path = location.hash;
        if (path === "") {
            path = location.hash = '/';
            return;
        }

        self.flush();

        for(var x in self.routes) {
            var route = self.routes[x];
            var match = null;
            if(match = route.pattern.exec(path)) {
                route.route(match);
            }
        }
    };
};

var EvMan = function () {
    var self = this;

    self.content = $("#contentbox");

    self.router = new Router();

    self.router.flush = function() {
        self.content.html('<div style="text-align: center;font-size: 20px;"><i class="fa fa-spinner fa-pulse fa-fw"></i> &nbsp; Loading</div>');
    };

    self.index = function(match) {
        $.get('/api/workshops', function(workshops) {

            $('.workshopName').html('AWS Workshops');
            $('.workshopLogo').attr("src", "/api/workshops/"+workshops[0].id+"/content/assets/images/"+workshops[0].logo)
            
            if (Object.keys(workshops).length === 1) {
                var ws = workshops[Object.keys(workshops)[0]];
                location.hash = '/workshop/' + ws.id;
                return;
            }

            $.get('/workshops.html', function(template) {
                self.content.html(template);
                new Vue({
                    el: '#workshops',
                    data: {
                        workshops: workshops
                    }
                })
            });

        });
    };

    self.workshop = function(match) {
        var workshop = match[1];
        $.get("/api/workshops/" + workshop, function(data) {
            location.hash = '/workshop/' + workshop + "/module/" + data.modules[0];
        });
    };

    self.module = function(match) {
        var workshop = match[1];
        var module = match[2];

        var url = new URI(document.URL);

        var data = {
            module: module
        };

        $.get('/api/workshops', function(workshops) {
            data.workshops = workshops;

            $.get("/api/workshops/" + workshop, function(tmp) {
                data.workshop = tmp;
                repoURL = data.workshop.repo_url;
                enableIssueSubmission = data.workshop.enable_issue_submission;
                
                $('.workshopTitle').text(data.workshop.workshop_title);
                $('.workshopLogo').attr("src", "/api/workshops/"+data.workshop.id+"/content/assets/images/"+data.workshop.logo)

                $.get("/api/workshops/" + workshop + "/modules", function(modules) {
                    data.modules = modules;

                    $.get("/api/workshops/" + workshop + "/content/module/" + module + "?" + url.query(), function(tmp) {
                        data.content = tmp;

                        data.doneModules = self.loadDoneModules();

                        window.name = data.workshop['name'];

                        for (var i = 0; i < data.workshop.modules.length; i++) {
                            if (data.workshop.modules[i] === module) {
                                data.prevModule = data.workshop.modules[i - 1];
                                data.nextModule = data.workshop.modules[i + 1];
                                data.currentModule = i + 1;
                            }
                        }

                        $('.workshopTitle').html(data.workshop.workshop_title);

                        if (modules[module] !== null && modules[module].requires !== null && modules[module].requires.length > 0) {
                            var prereqs = $("<div/>");
                            prereqs.addClass("module-prerequisites").html("These modules are required before starting with the current module:");
                            var list = $("<ul/>");
                            prereqs.append(list);
                            $.each(modules[module].requires, function(i, prereqModule) {
                                list.append("<li><a href='" + "#/workshop/" + workshop + "/module/" + prereqModule + "'>" + modules[prereqModule].name + "</a></li>");
                            });
                        }

                        $.get('/module.html', function(template) {
                            self.content.html(template);
                            new Vue({
                                el: '#module',
                                data: data
                            });
                            $('pre code').each(function(i, block) {
                                hljs.highlightBlock(block);
                            });
                            $(".mark-as-done").click(function() {
                                self.doneModule(data.doneModules, module);
                            });

                            if (Object.keys(workshops).length === 1) {
                                $('#breadcrumbs').css('display', 'none');
                            }
                            $('.workshopName').text(data.workshop.name);
    
                            var pre = document.getElementsByTagName('pre');
                            for (var i = 0; i < pre.length; i++) {
                              var button = document.createElement('button');
                              button.className = 'btn fa fa-copy';
                              pre[i].appendChild(button);
                            }

                            var clipboard = new Clipboard('.btn', {
                              target: function(trigger) {return trigger.previousElementSibling;}
                            });

                            function showSuccess(elem){elem.setAttribute('class','btn fa fa-check');}
                            function sleep (time) {
                              return new Promise((resolve) => setTimeout(resolve, time));
                            }
                            clipboard.on('success',function(e){
                              showSuccess(e.trigger);
                              sleep(350).then(() => {e.clearSelection();
                                e.trigger.setAttribute('class','btn fa fa-copy');})
                            });
                        });
                    });
                });
            });
        });
    };

    self.all = function(match) {
    };

    self.loadDoneModules = function() {
        var doneModules = Cookies.get("done-modules");

        if (typeof doneModules !== 'undefined') {
            doneModules = doneModules.split(';');
        } else {
            doneModules = [];
        }

        return doneModules;
    };

    self.doneModule = function(doneModules, module) {
        if (doneModules.indexOf(module) === -1) {
            doneModules.push(module);
        }
        Cookies.set("done-modules", doneModules.join(';'));
    };

    self.router.add(new RegExp(/^#[\/]?$/), self.index);
    self.router.add(new RegExp(/^#\/workshop\/([^\/]+)[\/]?$/), self.workshop);
    self.router.add(new RegExp(/^#\/workshop\/([^\/]+)\/all[\/]?$/), self.all);
    self.router.add(new RegExp(/^#\/workshop\/([^\/]+)\/module\/([^\/]+)[\/]?$/), self.module);
};

$(function() {
    window.evman = new EvMan();
    window.evman.router.route();
});

$(window).on('hashchange', function() {
    window.evman.router.route();
});


if (!window.x) {
    x = {};
}

x.Selector = {};
x.Selector.getSelected = function() {
  var t = '';
  if (window.getSelection) {
    t = window.getSelection();
  } else if (document.getSelection) {
    t = document.getSelection();
  } else if (document.selection) {
    t = document.selection.createRange().text;
  }
  return t;
}

$(document).ready(function() {
  $(document).bind("mouseup", function() {
    if(enableIssueSubmission === true) {
      var selectedText = x.Selector.getSelected();
      if(selectedText != ''){
        $('ul.selection-tools').css({
          'left': pageX + 5,
          'top' : pageY + 15
        }).fadeIn(200);
      } else {
        $('ul.selection-tools').fadeOut(200);
      }
    }
  });
  $(document).on("mousedown", function(e){
    pageX = e.pageX;
    pageY = e.pageY;
  });
  
  $(".github-issue").click(function(evt) {
    var selectedText = x.Selector.getSelected();
    
    pagetitle = $('title').text();
    baseURI = selectedText.baseNode.baseURI;
    selected = selectedText.toString();
    text = `Track: ${pagetitle}
Text: ${selected}
Issue Base URL: ${baseURI}`;
    
    url = repoURL+"/issues/new?body="+encodeURI(text)
    var win = window.open(url, '_blank');
    win.focus();
    evt.preventDefault(); 
    return false;
  })
});