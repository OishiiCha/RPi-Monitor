// This file is part of RPi-Monitor project
//
// Copyright 2013-2026 - Xavier Berger - http://rpi-experiences.blogspot.fr/
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Status page module.
 * @module rpimonitor.status
 */
(function() {
  'use strict';

  var strips;
  var animate;
  var statusautorefresh;
  var refreshTimerId;
  var clockId;

  function RowTemplate(id,image,title){
    return `<div data-id='${id}' class='row row${id} list-group-item' style='border: none'>` +
      `<hr class='row${id}' draggable='false'>` +
      `<div class='Title' draggable='false'>` +
      `<img src='${image}' alt='${title}' class='DragHandle' draggable='false'> &nbsp;${title}` +
      `</div>` +
      `<div class='Text' id='Text${id}' draggable='false'><b></b></div>` +
      `</div>`;
  }

  function ActivatePopover(){
    var info;
    while((info=window.postProcessInfo.pop()) != null) {
      var el = document.querySelector(info[0]);
      if (el) {
        new bootstrap.Popover(el, {trigger:'hover',placement:'bottom',html:true, title: info[1], content: info[2]});
      }
    }
    var pkgEl = document.getElementById("packages");
    if (pkgEl) {
      new bootstrap.Popover(pkgEl);
    }
  }

  function RenderStatus(data) {
    $.extend(true, data, getData('static'));
    $('#message').addClass('hide');

    for (var iloop=0; iloop < strips.length; iloop++){
      var visibility = safeEval(strips[iloop].visibility, {data: data});
      if ( visibility == 0) {
        $(`.row${iloop}`).addClass('hide');
      }
      else {
        $(`.row${iloop}`).removeClass('hide');
      }
      var text = "";
      for (var jloop=0; jloop < strips[iloop].line.length; jloop++){
        var line = strips[iloop].line[jloop];
        text += `<p>`;
        try {
          text += safeEval(line, {data: data});
        }
        catch (e) {
          text += `ERROR: ${line} -> ${e}`;
        }
        finally {
          text += `</p>`;
        }
      }
      $(`#Text${iloop}`).html(text);
    }

    var command;
    while((command=window.postProcessCommand.pop()) != null) {
      safeEvalStmt(command);
    }

    ActivatePopover();
  }

  function UpdateStatus () {
    window.justgageId = 0;
    $("#packages").empty();

    if (typeof rpimonitorSubscribe === 'function' && !window._rpimonitorWSSubscribed) {
      window._rpimonitorWSSubscribed = true;
      rpimonitorSubscribe(function(data) {
        window.justgageId = 0;
        $("#packages").empty();
        RenderStatus(data);
      });
    }

    $.getJSON('dynamic.json', function(data) {
      RenderStatus(data);
    })
    .fail(function() {
      $('#message').html(`<b>ERROR</b>: Can not get information (dynamic.json) from <b>RPi-Monitor</b> server.`);
      $('#message').removeClass('hide');
    });
  }

  function ConstructPage()
  {
    var activePage = GetURLParameter('activePage');
    if (activePage == null){ activePage = 0; }

    var data = getData('status');
    if ( ( typeof activePage == 'undefined') ||
         ( activePage >= data.length ) ) {
      activePage=0;
    }
    if ( data.length > 1 ) {
      $('#pageTitle').html(`<h2>${safeEval(data[activePage].title, {data: getData('static')})}</h2>`);
      $('#pageTitle').removeClass('hide');
    }
    for ( var iloop=0; iloop < data[activePage].content.length; iloop++) {
      var title;
      if ( typeof data[activePage].content[iloop].title != 'undefined' ){
        title = safeEval(data[activePage].content[iloop].title, {data: getData('static')});
      }
      else {
        title = data[activePage].content[iloop].name;
      }
      $(RowTemplate(iloop, `img/${data[activePage].content[iloop].icon}`, title)).insertBefore("#insertionPoint");
      strips=data[activePage].content;
    }
    UpdateStatus();
  }

  function AddOption()
  {
    var options = `<p><b>Status</b><br>` +
      `<form class="form-inline">` +
      `<input type="checkbox" id="statusautorefresh"> Auto refresh status page` +
      `</form></p>`;
    $(options).insertBefore("#optionsInsertionPoint");
  }

  $(function () {
    $.ajaxSetup({ cache: false });

    animate=(localStorage.getItem('animate') === 'true');
    statusautorefresh=(localStorage.getItem('statusautorefresh') === 'true');

    ShowFriends();
    setupqr();
    doqr(document.URL);

    ConstructPage();
    AddOption();

    $('#statusautorefresh').attr('checked', statusautorefresh );

    $('#animate').click(function(){
      animate = $('#animate').is(":checked");
      localStorage.setItem('animate', animate);
      SetProgressBarAnimate();
    });

    $('#statusautorefresh').click(function(){
      statusautorefresh = $('#statusautorefresh').is(":checked");
      localStorage.setItem('statusautorefresh', statusautorefresh);
      if ( statusautorefresh ) {
        UpdateStatus();
        refreshTimerId = setInterval( UpdateStatus , 10000 );
        clockId=setInterval(Tick,1000);
      }
      else {
        clearInterval(refreshTimerId);
        clearInterval(clockId);
      }
    });

    if ( statusautorefresh ) {
      refreshTimerId = setInterval( UpdateStatus , 10000 );
      clockId=setInterval(Tick,1000);
    }

    Sortable.create(sortableListGroup,{ handle: '.DragHandle',
                                        animation: 150,
                                        group: "status-row-order",
                                        store: {
                                            get: function (sortable) {
                                                var order = localStorage.getItem(sortable.options.group.name);
                                                return order ? order.split('|') : [];
                                            },
                                            set: function (sortable) {
                                                var order = sortable.toArray();
                                                localStorage.setItem(sortable.options.group.name, order.join('|'));
                                            }
                                        }
                                      }
                   );
  });
})();


