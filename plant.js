/* 
  WASTEWATER TREATMENT PLANT CLASS

             configuration, parameters 
               ↓ ↓     
  influent → [Plant] → effluent
               ↓ ↓     
             wastages (primary and secondary)
*/

//import files
try{
  State_Variables = require('./state-variables.js');    //class State_Variables
                    require('./primary-settler.js');    //tech primary_settler  (inside State Variables)
                    require('./activated-sludge.js');   //tech activated_sludge (inside State Variables)
                    require('./nitrification.js');      //tech nitrification    (inside State Variables)
                    require('./denitrification.js');    //tech denitrification  (inside State Variables)
                    require('./chemical-P-removal.js'); //tech chemical P rem   (inside activated sludge)
}catch(e){}

class Plant{
  constructor(influent, configuration, parameters){
    /*
      inputs
        - influent:      state variables object for influent
        - configuration: object for plant configuration
        - parameters:    object for plant parameters
    */
    this.influent      = influent;      //state variables object
    this.configuration = configuration; //object {pst,nit,dn,cpr}
    this.parameters    = parameters;    //object {fw,removal_BPO,removal_UPO,removal_iSS,T,Vp,Rs,RAS,waste_from,mass_FeCl3,SF,fxt,DO,pH,IR,DO_RAS,influent_alk}
  };

  //run the plant model
  run(){
    let conf = this.configuration; //make variable name shorter
    let p    = this.parameters;    //make variable name shorter

    //apply primary settler
    let pst;
    if(conf.pst) pst = this.influent.primary_settler(p.fw, p.removal_BPO, p.removal_UPO, p.removal_iSS);
    else         pst = {effluent:this.influent, wastage:null};

    //chemical P removal
    if(conf.cpr==false){ p.mass_FeCl3=0; }

    //apply AS + ( NIT + (DN) )
    let as;
    if(conf.dn)       as = pst.effluent.denitrification (p.T,p.Vp,p.Rs,p.RAS,p.waste_from,p.mass_FeCl3,p.SF,p.fxt,p.DO,p.pH,p.IR,p.DO_RAS,p.influent_alk);
    else if(conf.nit) as = pst.effluent.nitrification   (p.T,p.Vp,p.Rs,p.RAS,p.waste_from,p.mass_FeCl3,p.SF,p.fxt,p.DO,p.pH);
    else              as = pst.effluent.activated_sludge(p.T,p.Vp,p.Rs,p.RAS,p.waste_from,p.mass_FeCl3,);

    //all plant results {process_variables, streams, errors}
    return {
      process_variables:{
        as  : conf.dn ? as.as_process_variables  : (conf.nit ? as.as_process_variables : as.process_variables),
        nit : conf.dn ? as.nit_process_variables : (conf.nit ? as.process_variables    : null),
        dn  : conf.dn ? as.process_variables     : null,
        cpr : as.cpr,
      },   
      primary:{
        effluent: pst.effluent, //primary effluent (state variables object)
        wastage : pst.wastage,  //primary wastage  (state variables object)
      },
      secondary:{
        effluent: as.effluent, //secondary effluent (state variables object)
        wastage : as.wastage,  //secondary wastage  (state variables object)
      },
      errors: as.errors,
    };
  };
}

//export
try{module.exports=Plant;}catch(e){}

/*test*/
(function(){
  return;
  /*
    CREATE A NEW PLANT AND RUN MODEL
    syntax: 
      let p = new Plant(influent, configuration, parameters)
      let r = p.run();
  */ 

  //------------------------------(Q   VFA FBSO BPO  UPO  USO iSS FSA   OP    NOx OHO)
  let influent=new State_Variables(25, 50, 115, 440, 100, 45, 60, 39.1, 7.28, 0,  0  );
  let conf={pst:true, nit:true, dn:true, cpr:true}; //plant configuration
  let parameters={ //plant parameters
    fw          : 0.00500,   //ø     | PST | fraction of Q that goes to wastage
    removal_BPO : 42.3352,   //%     | PST | removal of the component X_BPO
    removal_UPO : 90.0500,   //%     | PST | removal of the component X_UPO
    removal_iSS : 75.1250,   //%     | PST | removal of the component X_iSS
    T           : 16.0000,   //ºC    | AS  | temperature
    Vp          : 8473.30,   //m3    | AS  | reactor volume
    Rs          : 15.0000,   //d     | AS  | solids retention time or sludge age
    RAS         : 1.00000,   //ø     | AS  | SST underflow recycle ratio
    waste_from  : "reactor", //option| AS  | waste_from | options {'reactor','sst'}
    mass_FeCl3  : 3000.00,   //kg/d  | CPR | mass of FeCl3 added for chemical P removal
    SF          : 1.25000,   //ø     | NIT | safety factor. design choice. Moves the sludge age
    fxt         : 0.39000,   //ø     | NIT | current unaerated sludge mass fraction
    DO          : 2.00000,   //mgO/L | NIT | DO in the aerobic reactor
    pH          : 7.20000,   //ø     | NIT | pH
    IR          : 5.40000,   //ø     | DN  | internal recirculation ratio
    DO_RAS      : 1.00000,   //mgO/L | DN  | DO in the underflow recycle
    influent_alk: 250.000,   //mg/L  | DN  | influent alkalinity (mg/L CaCO3)
  };
  let plant = new Plant(influent, conf, parameters);
  let run = plant.run();
  console.log(run.secondary.effluent.summary);
  console.log(run.process_variables);
})();