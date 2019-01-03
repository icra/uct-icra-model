/*Run model 1 time*/

//import files
try{
  State_Variables = require('./state-variables.js');    //class State_Variables
  Tram            = require('./tram.js');               //class Tram
                    require('./primary-settler.js');    //tech primary_settler  (inside State Variables)
                    require('./activated-sludge.js');   //tech activated_sludge (inside State Variables)
                    require('./nitrification.js');      //tech nitrification    (inside State Variables)
                    require('./denitrification.js');    //tech denitrification  (inside State Variables)
                    require('./chemical-P-removal.js'); //tech chemical P rem   (inside State Variables)
}catch(e){}

function run_model(influent, tram, conf, i, deg){
  /*
    inputs
    - influent: state variables object
    - tram:     tram object
    - conf:     dictionary for plant configuration
    - i:        dictionary for plant inputs
    - deg:      dictionary for river degradation 
  */

  //primary settler
  let pst;
  if(conf.pst) pst = influent.primary_settler(i.fw, i.removal_BPO, i.removal_UPO, i.removal_iSS);
  else         pst = { effluent:influent, wastage:null };

  //chemical P removal
  if(conf.cpr==false){ i.mass_FeCl3=0; }

  //AS + ( NIT + (DN) )
  let as;
  if(conf.dn)       as = pst.effluent.denitrification (i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.mass_FeCl3,i.SF,i.fxt,i.DO,i.pH,i.IR,i.DO_RAS,i.influent_alk);
  else if(conf.nit) as = pst.effluent.nitrification   (i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.mass_FeCl3,i.SF,i.fxt,i.DO,i.pH);
  else              as = pst.effluent.activated_sludge(i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.mass_FeCl3,);

  //new sv object: plant effluent + river upstream
  let river_mixed = tram.state_variables.combine(as.effluent);

  //new sv object: river end
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

  //pack process variables
  let as_process_variables  = conf.dn ? as.as_process_variables  : (conf.nit ? as.as_process_variables : as.process_variables);
  let nit_process_variables = conf.dn ? as.nit_process_variables : (conf.nit ? as.process_variables    : null);
  let dn_process_variables  = conf.dn ? as.process_variables     : null;

  //get TSS (total solids, kg/d) and FOt (oxygen demand, kg/d)
  let FOt = conf.dn ? dn_process_variables.FOt.value : (conf.nit ? nit_process_variables.FOt_fxt.value : as_process_variables.FOt.value); //kgO/d | oxygen demand
  let TSS = as.wastage.fluxes.totals.TSS.total;             //kgTSS/d | secondary sludge produced in sst
  if(conf.pst) TSS += pst.wastage.fluxes.totals.TSS.total;  //kgTSS/d | primary   sludge produced in pst

  //get NH4 and PO4 (plant and river)
  let NH4_plant = as.effluent.components.S_FSA; //mgN/L NH4 at plant effluent
  let PO4_plant = as.effluent.components.S_OP;  //mgP/L PO4 al plant effluent
  let NH4_river = river_end.components.S_FSA;   //mgN/L NH4 at river end
  let PO4_river = river_end.components.S_OP;    //mgP/L PO4 al river end

  //results
  return {
    FOt,               //kgO/d
    TSS,               //kgTSS/d
    NH4_plant,         //mgN/L
    NH4_river,         //mgN/L
    PO4_plant,         //mgP/L
    PO4_river,         //mgP/L
    errors: as.errors, //errors (Rs<Rsm and/or fxt>fxm)
  };
}

//export
try{module.exports=run_model;}catch(e){}

(function(){
  return;

  //nou influent------------------(Q   VFA FBSO BPO  UPO  USO iSS FSA   OP    NOx OHO)
  let influent=new State_Variables(25, 50, 115, 440, 100, 45, 60, 39.1, 7.28, 0,  0  );

  //configuració edar {primary_settler, nitrification, denitrification, chemical P removal, river}
  let conf={pst:true, nit:true, dn:true, cpr:true, river:true};

  //paràmetres edar (i=inputs)
  let i={
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

  //riu upstream---(wb      wt      Db        S          n       Li    Di   Ti)
  let tram=new Tram(25.880, 62.274, 18.45841, 0.0010055, 0.0358, 2000, 0.6, 15);

  //degradació riu
  let deg={
    R_20 :{ NH4:0.0000005, PO4:0.0000005 },
    k    :{ NH4:1,         PO4:1         },
  };

  //run model 1 time
  let r = run_model(influent, tram, conf, i, deg);
  console.log(r);
})();
