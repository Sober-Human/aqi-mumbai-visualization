// js/charts.js
// Requires Chart.js and PapaParse loaded before this script.
(function(){
  const dataCsv = 'data/cleaned_aqi.csv';
  const hasCanvas = id => !!document.getElementById(id);

  function showStatic(mode){
    // mode = 'static' or 'interactive'
    const interactive = mode !== 'static';
    // if static: hide canvases and show <img> fallbacks in dashboard.html
    if(!hasCanvas('annualAvgChart')) return;
    const annualCanvas = document.getElementById('annualAvgChart');
    const monthlyCanvas = document.getElementById('monthlyAvgChart');
    const annualImg = document.getElementById('annualAvgStatic');
    const monthlyImg = document.getElementById('monthlyAvgStatic');

    if(!interactive){
      if(annualCanvas) annualCanvas.style.display='none';
      if(monthlyCanvas) monthlyCanvas.style.display='none';
      if(annualImg) annualImg.style.display='block';
      if(monthlyImg) monthlyImg.style.display='block';
      return;
    } else {
      if(annualCanvas) annualCanvas.style.display='block';
      if(monthlyCanvas) monthlyCanvas.style.display='block';
      if(annualImg) annualImg.style.display='none';
      if(monthlyImg) monthlyImg.style.display='none';
    }
  }

  // Build charts from parsed rows
  function buildCharts(rows){
    // normalize rows
    const data = rows.map(r => ({
      date: new Date(r.Date),
      year: Number(r.Year || (new Date(r.Date)).getFullYear()),
      month: Number(r.Month || (new Date(r.Date)).getMonth()+1),
      day: Number(r.Day || (new Date(r.Date)).getDate()),
      aqi: r.AQI === '' || r.AQI == null ? null : Number(r.AQI),
      pollutant: r.ProminentPollutant || r.Pollutant || ''
    })).filter(r => r.aqi !== null && !isNaN(r.aqi));

    // Annual average
    const byYear = {};
    data.forEach(d => { byYear[d.year] = byYear[d.year]||[]; byYear[d.year].push(d.aqi); });
    const years = Object.keys(byYear).map(Number).sort((a,b)=>a-b);
    const annualAvg = years.map(y => + (byYear[y].reduce((s,x)=>s+x,0)/byYear[y].length).toFixed(1) );

    if(hasCanvas('annualAvgChart')){
      const ctx = document.getElementById('annualAvgChart').getContext('2d');
      window.annualChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: years.map(String), datasets:[{ label:'Avg AQI', data: annualAvg, backgroundColor:['#2b6cb0','#68d391','#f6ad55'] }]},
        options: { responsive:true, plugins:{ legend:{display:false} }, scales:{ y:{ beginAtZero:false, suggestedMax: Math.max(...annualAvg)*1.6 } } }
      });
    }

    // Monthly grouped
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyByYear = {};
    years.forEach(y => monthlyByYear[y] = Array.from({length:12}, ()=>({sum:0,count:0})));
    data.forEach(d => {
      const idx = d.month - 1;
      monthlyByYear[d.year][idx].sum += d.aqi;
      monthlyByYear[d.year][idx].count += 1;
    });
    const datasets = years.map((y,i)=>({
      label:String(y),
      data: monthlyByYear[y].map(c => c.count ? +(c.sum/c.count).toFixed(1) : null),
      backgroundColor: ['#ff6384','#36a2eb','#4bc0c0','#ff9f40','#9966ff'][i%5]
    }));
    if(hasCanvas('monthlyAvgChart')){
      const ctx2 = document.getElementById('monthlyAvgChart').getContext('2d');
      window.monthlyChart = new Chart(ctx2, {
        type: 'bar',
        data: { labels: months, datasets: datasets },
        options: { responsive:true, plugins:{ legend:{position:'top'} }, scales:{ y:{ beginAtZero:true } } }
      });
    }

    // Daily trends (one line per year)
    if(hasCanvas('dailyChart')){
      const datasetsDaily = years.map((y,i)=>{
        const arr = data.filter(d => d.year===y).map(d=>({x:d.date,y:d.aqi})).sort((a,b)=>a.x-b.x);
        return { label:String(y), data:arr, borderColor: ['#ff6384','#36a2eb','#4bc0c0'][i%3], backgroundColor:'transparent', pointRadius:0, borderWidth:1.5, tension:0.2 };
      });
      const ctx3 = document.getElementById('dailyChart').getContext('2d');
      window.dailyChart = new Chart(ctx3, {
        type: 'line',
        data: { datasets: datasetsDaily },
        options: { responsive:true, parsing:{ xAxisKey:'x', yAxisKey:'y' }, scales:{ x:{ type:'time', time:{ unit:'month' } }, y:{ title:{ display:true, text:'AQI' } } }, plugins:{ legend:{position:'top'} } }
      });
    }
  }

  // Setup controls
  document.addEventListener('DOMContentLoaded', function(){
    const modeEl = document.getElementById('displayMode');
    if(modeEl){
      modeEl.addEventListener('change', (e)=> showStatic(e.target.value==='static' ? 'static':'interactive'));
    }

    // try load CSV
    Papa.parse(dataCsv, { download:true, header:true, skipEmptyLines:true,
      complete:function(results){
        if(!results || !results.data || results.data.length===0){ showStatic('static'); return; }
        buildCharts(results.data);
        showStatic('interactive');
      },
      error:function(){ showStatic('static'); }
    });
  });
})();
