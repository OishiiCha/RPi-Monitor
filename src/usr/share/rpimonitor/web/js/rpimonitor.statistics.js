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
 * Statistics page module using Chart.js.
 * Replaces flot charts and javascriptrrd with modern Chart.js rendering.
 * Fetches RRD data as JSON from /stat/:name.json endpoint.
 * @module rpimonitor.statistics
 */
(function() {
  'use strict';

  var activestat = 0;
  var graphconf = null;
  var activePage = 0;
  var staticData = null;
  var active_rra = 0;
  var chartInstance = null;
  var rraLabels = ['Graph n°1', 'Graph n°2', 'Graph n°3', 'Graph n°4', 'Graph n°5'];

  /**
   * Initialize the statistics page.
   * @returns {void}
   */
  function Start() {
    staticData = getData('static');
    graphconf = getData('statistics');

    activestat = GetURLParameter('graph');
    if (activestat == null) {
      activestat = parseInt(localStorage.getItem('activestat')) || 0;
    }
    activePage = GetURLParameter('activePage');
    if (activePage == null) {
      activePage = 0;
    }
    if (typeof activePage === 'undefined' || activePage >= graphconf.length) {
      activePage = 0;
    }
    if (graphconf.length > 1) {
      $('#pageTitle').html(`<h2>${safeEval(graphconf[activePage].title, {data: staticData, static: staticData})}</h2><hr>`);
      $('#pageTitle').removeClass('hide');
    }

    FetchGraph();
  }

  /**
   * Populate the graph selector dropdown.
   * @returns {void}
   */
  function SetGraphlist() {
    var options = graphconf[activePage].content.map(function(item, i) {
      var title = safeEval(item.title, {data: staticData, static: staticData});
      return `<option value='${i}'${activestat == i ? ' selected' : ''}>${title}</option>`;
    }).join('\n');

    $("#mygraph_res_title").html(`Graph: <select id='selected_graph'>\n${options}\n</select>`);

    $('#selected_graph').on('change', function() {
      activestat = parseInt(this.value);
      localStorage.setItem('activestat', activestat);
      FetchGraph();
    });
  }

  /**
   * Fetch RRD data as JSON and render the graph.
   * @returns {void}
   */
  function FetchGraph() {
    $('#preloader').removeClass('hide');
    if (activestat >= graphconf[activePage].content.length) {
      activestat = 0;
      localStorage.setItem('activestat', activestat);
    }

    var graphList = graphconf[activePage].content[activestat].graph;
    var options = graphconf[activePage].content[activestat];
    var dsGraphOptions = options.ds_graph_options || {};
    var graphOptions = options.graph_options || {};

    // Evaluate string configs
    for (var dsName in dsGraphOptions) {
      for (var param in dsGraphOptions[dsName]) {
        try {
          dsGraphOptions[dsName][param] = safeEval('(' + dsGraphOptions[dsName][param] + ')');
        } catch(e) {}
      }
    }
    for (var param in graphOptions) {
      try {
        graphOptions[param] = safeEval('(' + graphOptions[param] + ')');
      } catch(e) {}
    }

    // Fetch all RRD data as JSON in parallel
    var promises = graphList.map(function(name) {
      var url = (staticData == null || staticData[name])
        ? 'stat/empty.json'
        : 'stat/' + name + '.json';
      return $.getJSON(url).then(function(resp) {
        return { name: name, data: resp };
      }).fail(function() {
        return { name: name, data: { series: [] } };
      });
    });

    $.when.apply($, promises).done(function() {
      var results = Array.prototype.slice.call(arguments);
      RenderChart(results, graphList, dsGraphOptions, graphOptions);
      SetGraphlist();
      $('#preloader').addClass('hide');
      $('#Legend').addClass('hide');
    });
  }

  /**
   * Render the Chart.js graph from fetched data.
   * @param {Array} results - Array of {name, data} objects.
   * @param {Array} graphList - List of graph names.
   * @param {Object} dsGraphOptions - Per-DS graph options.
   * @param {Object} graphOptions - Global graph options.
   * @returns {void}
   */
  function RenderChart(results, graphList, dsGraphOptions, graphOptions) {
    var canvas = document.getElementById('mygraph');
    if (!canvas) return;

    // Destroy previous chart
    if (chartInstance) {
      chartInstance.destroy();
    }

    // Collect all timestamps and build datasets
    var datasets = [];
    var allTimestamps = new Set();

    results.forEach(function(result, idx) {
      var series = result.data.series || [];
      var dsOpts = dsGraphOptions[result.name] || {};

      series.forEach(function(s) {
        s.data.forEach(function(point) {
          allTimestamps.add(point[0]);
        });

        var label = dsOpts.label || s.name;
        var color = dsOpts.color || ['#0d6efd', '#dc3545', '#198754', '#ffc107', '#6610f2'][idx % 5];

        var dataPoints = s.data.map(function(point) {
          return { x: point[0] * 1000, y: point[1] };
        });

        datasets.push({
          label: label,
          data: dataPoints,
          borderColor: color,
          backgroundColor: color + '20',
          borderWidth: dsOpts.lineWidth || 2,
          fill: dsOpts.fill || false,
          tension: dsOpts.tension || 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        });
      });
    });

    var chartType = (graphOptions && graphOptions.type) || 'line';

    var ctx = canvas.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: chartType,
      data: { datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            type: 'time',
            time: { displayFormats: { second: 'HH:mm:ss', minute: 'HH:mm', hour: 'MM/DD HH:mm', day: 'MM/DD' } },
            title: { display: true, text: 'Time' }
          },
          y: {
            title: { display: true, text: (graphOptions && graphOptions.yLabel) || 'Value' }
          }
        },
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: { mode: 'index', intersect: false }
        }
      }
    });
  }

  /**
   * Add the RRA selector to the options dialog.
   * @returns {void}
   */
  function AddOption() {
    var options = rraLabels.map(function(label, i) {
      return `<option value='${i}'${active_rra == i ? ' selected' : ''}>${label}</option>`;
    }).join('');

    var html = `<p><b>Statistic</b><br>` +
      `<form class="form-inline">` +
      `<span>Default graph timeline <select class="form-select w-auto d-inline-block" id="active_rra">${options}</select></span>` +
      `</form></p>`;
    $(html).insertBefore("#optionsInsertionPoint");
  }

  // Initialize on DOM ready
  $(function() {
    // Remove the Javascript warning
    document.getElementById("infotable").deleteRow(0);

    active_rra = parseInt(localStorage.getItem('active_rra')) || 0;

    $.ajaxSetup({ cache: false });

    ShowFriends();
    setupqr();
    doqr(document.URL);

    Start();

    AddOption();

    $('#active_rra').change(function() {
      localStorage.setItem('active_rra', $('#active_rra').val());
    });
  });
})();
