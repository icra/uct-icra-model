//GET inputs from URL
let url=new URL(window.location.href);

//iterate GET keys
for(let pair of url.searchParams.entries()){
  let key = pair[0];
  let val = pair[1];
  let el  = document.querySelector(`#inputs #${key}`);
  if(el){ 
    if(el.type=='checkbox'){
      if(val=='true') el.checked=true;
    }else{
      //includes <input type=number> and <select id>
      el.value = val;
    }
  }
}

//execute model
document.querySelector('button#run').addEventListener('click',function(){
  //get influent
  let influent=new State_Variables(
    parseFloat(document.querySelector('#influent #Q').value),
    parseFloat(document.querySelector('#influent #S_VFA').value),
    parseFloat(document.querySelector('#influent #S_FBSO').value),
    parseFloat(document.querySelector('#influent #X_BPO').value),
    parseFloat(document.querySelector('#influent #X_UPO').value),
    parseFloat(document.querySelector('#influent #S_USO').value),
    parseFloat(document.querySelector('#influent #X_iSS').value),
    parseFloat(document.querySelector('#influent #S_FSA').value),
    parseFloat(document.querySelector('#influent #S_OP').value),
    parseFloat(document.querySelector('#influent #S_NOx').value),
  );

  //read mass ratios from screen and modify influent object
  ['CV','C','N','P'].forEach(c1=>{
    ['VFA','FBSO','BPO','UPO','USO','OHO'].forEach(c2=>{
      influent.mass_ratios[`f_${c1}_${c2}`] =
        parseFloat(document.querySelector(`#mass_ratios #f_${c1}_${c2}`).value);
    });
  });

  //read constants (kinetic parameters) from DOM
  document.querySelectorAll('#inputs #constants input[id]').forEach(input=>{
    constants[input.id]=parseFloat(input.value);
  });

  //get plant configuration from DOM
  let conf={
    pst:document.querySelector('#edar #pst').checked,
    nit:document.querySelector('#edar #nit').checked,
    dn :document.querySelector('#edar #dn').checked,
    cpr:document.querySelector('#edar #cpr').checked,
  };

  //get plant configuration parameters from DOM
  let parameters={
    fw          : parseFloat(document.querySelector('#edar #fw').value),
    removal_BPO : parseFloat(document.querySelector('#edar #removal_BPO').value),
    removal_UPO : parseFloat(document.querySelector('#edar #removal_UPO').value),
    removal_iSS : parseFloat(document.querySelector('#edar #removal_iSS').value),
    T           : parseFloat(document.querySelector('#edar #T').value),
    Vp          : parseFloat(document.querySelector('#edar #Vp').value),
    Rs          : parseFloat(document.querySelector('#edar #Rs').value),
    RAS         : parseFloat(document.querySelector('#edar #RAS').value),
    waste_from  :            document.querySelector('#edar #waste_from').value,
    mass_FeCl3  : parseFloat(document.querySelector('#edar #mass_FeCl3').value),
    DSVI        : parseFloat(document.querySelector('#edar #DSVI').value),
    A_ST        : parseFloat(document.querySelector('#edar #A_ST').value),
    fq          : parseFloat(document.querySelector('#edar #fq').value),
    SF          : parseFloat(document.querySelector('#edar #SF').value),
    fxt         : parseFloat(document.querySelector('#edar #fxt').value),
    DO          : parseFloat(document.querySelector('#edar #DO').value),
    pH          : parseFloat(document.querySelector('#edar #pH').value),
    IR          : parseFloat(document.querySelector('#edar #IR').value),
    DO_RAS      : parseFloat(document.querySelector('#edar #DO_RAS').value),
    influent_alk: parseFloat(document.querySelector('#edar #influent_alk').value),
  };

  /*create new plant, run the model*/
  let plant = new Plant(influent, conf, parameters);
  let run = plant.run();
  //console.log(run);
  /*backend end-------*/

  /*GUI integration (read 'run' object)*/
  (function print_results(){
    console.time('print results');

    //draw fractionation columns
    (function draw_fractionation(){
      //state variables (per ordre)
      let svs = {};
      svs.Influent                      = plant.influent;         //state variables object
      if(conf.pst) svs.Primary_wastage  = run.primary.wastage;    //state variables object
      if(conf.pst) svs.Primary_effluent = run.primary.effluent;   //state variables object
      svs.Secondary_wastage             = run.secondary.wastage;  //state variables object
      svs.Secondary_effluent            = run.secondary.effluent; //state variables object

      if(Object.keys(svs).length==0)return;
      let div   = document.querySelector('div#fractionation');div.innerHTML=""; //buida div summaries
      let table = document.createElement('table');div.appendChild(table);       //crea nova taula
      let newRow=table.insertRow(-1);
      newRow.insertCell(-1).outerHTML="<td colspan=2>";

      //posa noms variables d'estat
      Object.keys(svs).forEach(nom=>{newRow.insertCell(-1).outerHTML="<td colspan=2 style=font-size:smaller stream>"+nom.replace('_','<br>');});

      //calcula tots els fraccionaments
      let totals={};
      Object.entries(svs).forEach(([nom,sv])=>{totals[nom]=sv.totals;});

      //agafa el primer fraccionament per posar noms de les variables
      let primer_fraccionament=Object.values(totals).find(e=>e);

      //itera COD,TKN,TP,TOC,TSS
      Object.entries(primer_fraccionament).forEach(([key,fraccions])=>{
        let newRow = table.insertRow(-1);
        let newCell = newRow.insertCell(-1);
        newCell.innerHTML=key;                           //COD,TKN,TP,TOC,TSS
        newCell.rowSpan=Object.keys(fraccions).length+1; //bsCOD,usCOD,bpCOD,upCOD...

        //itera cada fracció dins de cada key
        Object.keys(fraccions).forEach(fraction=>{
          let newRow=table.insertRow(-1);

          //posa la mateixa nomenclatura de George Ekama
          let nomenclatura={
            "FSA":"N<sub>a</sub>",
            "PO4":"P<sub>s</sub>",
            "bCOD":"S<sub>b</sub>",
            "uCOD":"S<sub>u</sub>",
            "sCOD":"S<sub>s</sub>",
            "pCOD":"S<sub>p</sub>",
            "bsCOD":"S<sub>bs</sub>",
            "usCOD":"S<sub>us</sub>",
            "bpCOD":"S<sub>bp</sub>",
            "upCOD":"S<sub>up</sub>",
            "ON":"N<sub>o</sub>",
            "bON":"N<sub>ob</sub>",
            "uON":"N<sub>ou</sub>",
            "sON":"N<sub>os</sub>",
            "pON":"N<sub>op</sub>",
            "bsON":"N<sub>obs</sub>",
            "usON":"N<sub>ous</sub>",
            "bpON":"N<sub>obp</sub>",
            "upON":"N<sub>oup</sub>",
            "OP":"P<sub>o</sub>",
            "bOP":"P<sub>ob</sub>",
            "uOP":"P<sub>ou</sub>",
            "sOP":"P<sub>os</sub>",
            "pOP":"P<sub>op</sub>",
            "bsOP":"P<sub>obs</sub>",
            "usOP":"P<sub>ous</sub>",
            "bpOP":"P<sub>obp</sub>",
            "upOP":"P<sub>oup</sub>",
            "OC":"C<sub>o</sub>",
            "bOC":"C<sub>ob</sub>",
            "uOC":"C<sub>ou</sub>",
            "sOC":"C<sub>os</sub>",
            "pOC":"C<sub>op</sub>",
            "bsOC":"C<sub>obs</sub>",
            "usOC":"C<sub>ous</sub>",
            "bpOC":"C<sub>obp</sub>",
            "upOC":"C<sub>oup</sub>",
          }[fraction]||fraction;

          if(fraction=='total'){
            if(key=='COD') nomenclatura='S<sub>t</sub>';
            if(key=='TOC') nomenclatura='C<sub>t</sub>';
            if(key=='TKN') nomenclatura='N<sub>t</sub>';
            if(key=='TP' ) nomenclatura='P<sub>t</sub>';
          }
          if(fraction=='active'){
            if(key=='COD') nomenclatura='S<sub>OHO</sub>';
            if(key=='TOC') nomenclatura='C<sub>OHO</sub>';
            if(key=='TKN') nomenclatura='N<sub>OHO</sub>';
            if(key=='TP' ) nomenclatura='P<sub>OHO</sub>';
          }
          if(key=='TSS'){
            if(fraction=='total')  nomenclatura='X<sub>t</sub>';
            if(fraction=='iSS')    nomenclatura='X<sub>IO</sub>';
            if(fraction=='VSS')    nomenclatura='X<sub>v</sub>';
            if(fraction=='bVSS')   nomenclatura='X<sub>vb</sub>';
            if(fraction=='uVSS')   nomenclatura='X<sub>vu</sub>';
            if(fraction=='active') nomenclatura='X<sub>OHO</sub>';
          }
          newRow.insertCell(-1).innerHTML=nomenclatura;

          //itera variables d'estat
          Object.entries(svs).forEach(([nom,sv])=>{
            let mgL = totals[nom][key][fraction]; //concentració
            let kgd = sv.Q*mgL;                   //flux
            newRow.insertCell(-1).outerHTML=`<td class=number conc>${format(mgL)}</td>`;
            newRow.insertCell(-1).outerHTML=`<td class=number flux>${format(kgd)}</td>`;
          });
        });
      });
    })();

    //dibuixa summaries en columnes
    (function draw_summaries(){
      //recopila summaries variables d'estat (per ordre)
      let summaries = {};
      summaries.Influent                      = plant.influent.summary;
      if(conf.pst) summaries.Primary_wastage  = run.primary.wastage.summary;
      if(conf.pst) summaries.Primary_effluent = run.primary.effluent.summary;
      summaries.Secondary_wastage             = run.secondary.wastage.summary;
      summaries.Secondary_effluent            = run.secondary.effluent.summary;

      if(Object.keys(summaries).length==0)return;
      let div   = document.querySelector('div#summaries'); div.innerHTML=""; //buida div summaries
      let table = document.createElement('table');div.appendChild(table);    //crea nova taula
      let newRow = table.insertRow(-1);newRow.insertCell(-1).innerHTML="";   //posa els noms de les variables d'estat
      Object.keys(summaries).forEach(key=>{newRow.insertCell(-1).outerHTML="<td colspan=2 style=font-size:smaller stream>"+key.replace('_','<br>');});
      //itera keys del primer objecte (Q,COD,TKN...)
      Object.keys(Object.values(summaries)[0]).forEach(key=>{
        let newRow = table.insertRow(-1);
        if(key=="Q"){
          newRow.insertCell(-1).innerHTML=`${key} <span class=unit>(ML/d)</span>`;
        }else{
          newRow.insertCell(-1).innerHTML=`${key} <span unit class=unit>(mg/L, kg/d)</span>`;
        }
        //itera cada variable d'estat
        Object.entries(summaries).forEach(([name,sv])=>{
          if(key=="Q"){
            let Q = sv.Q;
            newRow.insertCell(-1).outerHTML=`<td class=number colspan=2 flow value=${Q}>${format(Q)}</td>`;
          }else{
            let conc = sv[key][0];
            let flux = sv[key][1];
            let conc_txt = format(conc);
            let flux_txt = format(flux);
            if(name=="River_end" && (key!="NH4" && key!="PO4")){ conc_txt = flux_txt = "<span style=color:#ccc>ø</span>"; }
            newRow.insertCell(-1).outerHTML=`<td class=number conc title=${conc}>${conc_txt}</td>`;
            newRow.insertCell(-1).outerHTML=`<td class=number flux title=${flux}>${flux_txt}</td>`;
          }
        });
      });
    })();

    //dibuixa process variables (pvs)
    (function draw_pvs(){
      //recopila process_variables
      let processes = document.querySelector('#processes'); processes.innerHTML="";
      let pvs = {};
                    pvs.Activated_sludge   = run.process_variables.as;
      if(conf.nit) pvs.Nitrification      = run.process_variables.nit;
      if(conf.dn)  pvs.Denitrification    = run.process_variables.dn;
      if(conf.cpr) pvs.Chemical_P_removal = run.process_variables.cpr;

      Object.entries(pvs).forEach(([key,pv])=>{
        //container pel key i la taula: <div><div>key</div><table></table></div>
        let div = document.createElement('div'); processes.appendChild(div);

        //nom tecnologia
        let nom = document.createElement('code'); div.appendChild(nom);
        nom.style.fontSize='small';
        nom.innerHTML=`${key.replace(/_/g,' ')}&nbsp;`;

        //taula process variables
        let table = document.createElement('table'); div.appendChild(table);
        Object.entries(pv).forEach(([key,obj])=>{
          let newRow = table.insertRow(-1);
          newRow.id=key;
          let value = obj.value;
          newRow.value=value;
          newRow.setAttribute('title',obj.descr);
          newRow.insertCell(-1).innerHTML=key;
          newRow.insertCell(-1).outerHTML=`<td class=number title='${value}'><small>${format(value)}</small>`;
          newRow.insertCell(-1).outerHTML="<td class=unit>"+obj.unit.prettifyUnit();
        });
      });
    })();

    //dibuixa errors
    (function draw_errors(errors){
      document.querySelector('#error_counter').innerHTML=errors.length ? `(<b>${errors.length}</b>)`:'(0)';
      let div=document.querySelector('#outputs #errors');
      div.innerHTML=errors.length?"":"<li class=error>no errors";
      errors.forEach(error=>{
        div.appendChild((function(){
          let li=document.createElement('li');
          li.classList.add('error');
          li.innerHTML=error;
          return li;
        })());
      });
    })(run.errors);

    //clica unitats marcades
    document.querySelector('input[name=summary_units]:checked').click();

    console.timeEnd('print results');
  })();
});

//genera URL amb els current inputs
document.querySelector('button#run').addEventListener('click',function(){
  let newUrl = url.origin + url.pathname + '?'; //new url with all current inputs
  //get <input> elements
  document.querySelectorAll('#inputs input[id]').forEach(input=>{
    if(input.type=='checkbox') input.value = input.checked;
    newUrl += `${input.id}=${input.value}&`;
  });
  //get <select> elements
  document.querySelectorAll('#inputs select[id]').forEach(select=>{
    newUrl += `${select.id}=${select.value}&`;
  });
  //delete last '&' character
  newUrl = newUrl.substring(0,newUrl.length-1);
  //write newUrl to GUI
  if(newUrl.length<2083){
    document.querySelector('#outputs #export').value=newUrl;
  }else{
    document.querySelector('#outputs #export').value="url too long (unsolved error, please contact developers)";
  }
});

//select unit in summaries
document.querySelectorAll('input[name=summary_units]').forEach(input=>{
  input.addEventListener('click',function(){
    let outputs = document.querySelector('#outputs');
    switch(this.value){
      case "conc": 
        outputs.querySelectorAll('td[conc]').forEach(td=>td.style.display='');
        outputs.querySelectorAll('td[flux]').forEach(td=>td.style.display='none');
        outputs.querySelectorAll('td[flow]').forEach(td=>td.colSpan=1);
        outputs.querySelectorAll('td[stream]').forEach(td=>td.colSpan=1);
        outputs.querySelectorAll('span[unit]').forEach(td=>td.innerHTML="(mg/L)");
        break;
      case "flux": 
        outputs.querySelectorAll('td[conc]').forEach(td=>td.style.display='none');
        outputs.querySelectorAll('td[flux]').forEach(td=>td.style.display='');
        outputs.querySelectorAll('td[flow]').forEach(td=>td.colSpan=1);
        outputs.querySelectorAll('td[stream]').forEach(td=>td.colSpan=1);
        outputs.querySelectorAll('span[unit]').forEach(td=>td.innerHTML="(kg/d)");
        break;
      case "both":
        outputs.querySelectorAll('td[conc]').forEach(td=>td.style.display='');
        outputs.querySelectorAll('td[flux]').forEach(td=>td.style.display='');
        outputs.querySelectorAll('td[flow]').forEach(td=>td.colSpan=2);
        outputs.querySelectorAll('td[stream]').forEach(td=>td.colSpan=2);
        outputs.querySelectorAll('span[unit]').forEach(td=>td.innerHTML="(mg/L, kg/d)");
        break;
    }
  });
});

//keypress listener for enter key
document.querySelectorAll('#inputs input').forEach(input=>{
  input.addEventListener('keypress',function(e){
    if(e.key=="Enter"){
      document.querySelector('button#run').click();
    }
  }); 
});

//click listener for title
document.querySelector('#title').addEventListener('click',function(){window.location=url.origin+url.pathname;});

//focus listener for #export
document.querySelector('#export').addEventListener('focus',function(){this.select();});

//click run button
document.querySelector('button#run').click();

//disable plant inputs when technology checkbox is not enabled
document.querySelectorAll('#inputs #edar input[type=checkbox][id]').forEach(input=>{
  function disable_inner_inputs(el){
    document.querySelectorAll(`#inputs #edar tr#tr_${el.id} input[id]`).forEach(inp=>{
      if(inp.id==el.id)return;
      inp.disabled=!el.checked;
    });
  }
  disable_inner_inputs(input);
  input.addEventListener('click',function(){
    disable_inner_inputs(this);
  });
});
