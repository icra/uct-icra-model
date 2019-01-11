/*run phase 1 model (1 plant + 1 river)*/

//import model
try{
  State_Variables = require('./state-variables.js');    //class State_Variables
  Plant           = require('./plant.js');              //class Plant
  Tram            = require('./tram.js');               //class Tram (river)
}catch(e){}

function run_model(influent, configuration, parameters, tram, deg){
  /*
    inputs
    - influent: state variables object
    - conf:     object for plant configuration
    - plant:    object for plant inputs (=parameters)
    - tram:     river (tram object)
    - deg:      dictionary for river degradation 
  */

  //create plant and run model
  let plant = new Plant(influent, configuration, parameters);
  let run = plant.run();

  //get plant effluent
  let effluent = run.streams.effluent;

  //combine plant effluent + river upstream
  let river_mixed = effluent.combine(tram.state_variables);

  //NH4 and PO4 concentration at river end
  let river_end = new State_Variables(
    river_mixed.Q, //Q
    0,             //VFA
    0,             //FBSO
    0,             //BPO
    0,             //UPO
    0,             //USO
    0,             //iSS
    tram.Mf(river_mixed.components.S_FSA, deg.R_20.NH4, deg.k.NH4), //FSA (NH4)
    tram.Mf(river_mixed.components.S_OP,  deg.R_20.PO4, deg.k.PO4), //OP  (PO4)
    0,             //NOx
    0,             //OHO
  );

  //results for a single run: process variables, streams and errors
  //TODO this structure is only for a fixed network with only 1 plant and 1 river 
  return {
    plant: run,
    river:{
      mix: river_mixed,
      end: river_end,
    },
  }
}

//export
try{module.exports=run_model;}catch(e){}

//test
(function(){
  /*
    run phase 1 model (1 plant + 1 river)
    syntax: run_model(influent, conf, parameters, river, deg)
  */

  //new influent------------------(Q   VFA FBSO BPO  UPO  USO iSS FSA   OP    NOx OHO)
  let influent=new State_Variables(25, 50, 115, 440, 100, 45, 60, 39.1, 7.28, 0,  0  );

  //config edar {pst, nit, dn, cpr, river}
  let conf={pst:true, nit:true, dn:true, cpr:true, river:true};

  //paràmetres edar (i=inputs, canviar nom "i" a "plant_parameters")
  let parameters={
    fw           : 0.005,     //ø     | PST | fraction of Q that goes to wastage
    removal_BPO  : 42.3352,   //%     | PST | removal of the component X_BPO
    removal_UPO  : 90.05,     //%     | PST | removal of the component X_UPO
    removal_iSS  : 75.125,    //%     | PST | removal of the component X_iSS
    T            : 16,        //ºC    | AS  | temperature
    Vp           : 8473.3,    //m3    | AS  | reactor volume
    Rs           : 15,        //d     | AS  | solids retention time or sludge age
    RAS          : 1.0,       //ø     | AS  | SST underflow recycle ratio
    waste_from   : "reactor", //option| AS  | waste_from | options {'reactor','sst'}
    mass_FeCl3   : 3000,      //kg/d  | CPR | mass of FeCl3 added for chemical P removal
    SF           : 1.25,      //ø     | NIT | safety factor. design choice. Moves the sludge age
    fxt          : 0.39,      //ø     | NIT | current unaerated sludge mass fraction
    DO           : 2.0,       //mgO/L | NIT | DO in the aerobic reactor
    pH           : 7.2,       //ø     | NIT | pH
    IR           : 5.4,       //ø     | DN  | internal recirculation ratio
    DO_RAS       : 1.0,       //mgO/L | DN  | DO in the underflow recycle
    influent_alk : 250,       //mg/L  | DN  | influent alkalinity (mg/L CaCO3)
  };

  //riu upstream--(wb      wt      Db        S          n       Li    Di   Ti)
  let river=new Tram(25.880, 62.274, 18.45841, 0.0010055, 0.0358, 2000, 0.6, 15);

  //degradació riu
  let deg={
    R_20 :{ NH4:0.0000005, PO4:0.0000005 },
    k    :{ NH4:1,         PO4:1         },
  };

  //run model
  let result = run_model(influent, conf, parameters, river, deg);

  /*from now on we will look inside result object to fetch for desired outputs*/

  //get FOt (oxygen demand, kg/d)
  let FOt = (function(){
    let key = conf.dn ? 'dn' : (conf.nit ? 'nit' : 'as');
    return result.plant.process_variables[key].FOt.value; //kgO/d | oxygen demand
  })();

  //get TSS (total solids, kg/d)
  let TSS           = result.plant.streams.sst_wastage.fluxes.totals.TSS.total; //kgTSS/d | secondary sludge produced in sst
  if(conf.pst) TSS += result.plant.streams.pst_wastage.fluxes.totals.TSS.total; //kgTSS/d | primary   sludge produced in pst

  //get output NH4 and PO4 (plant and river end)
  let NH4_plant = result.plant.streams.effluent.components.S_FSA;  //mgN/L NH4 at plant effluent
  let PO4_plant = result.plant.streams.effluent.components.S_OP;   //mgP/L PO4 al plant effluent
  let NH4_river = result.river.end.components.S_FSA;               //mgN/L NH4 at river end
  let PO4_river = result.river.end.components.S_OP;                //mgP/L PO4 al river end
  console.log({
    FOt,
    TSS,
    NH4_plant,
    PO4_plant,
    NH4_river,
    PO4_river,
  });
})();
