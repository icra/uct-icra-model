/*
  WASTEWATER TREATMENT PLANT CLASS

             {configuration}, {parameters}
                ↓ ↓
  {influent} → [Plant] → {effluent}
                ↓ ↓
             {wastages} (primary and secondary)
*/

//import files
try{
  State_Variables = require('./state-variables.js'); //class State_Variables
  require('./primary-settler.js');                   //prototype primary_settler  (in State Variables)
  require('./activated-sludge.js');                  //prototype activated_sludge (in State Variables)
  require('./nitrification.js');                     //prototype nitrification    (in State Variables)
  require('./denitrification.js');                   //prototype denitrification  (in State Variables)
  require('./chemical-P-removal.js');                //function chemical P rem   (in activated sludge)
}catch(e){}

class Plant{
  constructor(influent, configuration, parameters){
    /*
      inputs
        - influent:      influent object (state variables class)
        - configuration: plant configuration object
        - parameters:    plant parameters object
    */
    this.influent      = influent;      //state variables object
    this.configuration = configuration; //object {pst,nit,dn,cpr}
    this.parameters    = parameters;    //object {fw,removal_BPO,removal_UPO,removal_iSS,T,Vp,Rs,RAS,waste_from,mass_FeCl3,SF,fxt,DO,pH,IR,DO_RAS,influent_alk}
  };

  //run the plant model
  run(){
    console.time('>> run uct-icra plant model'); //measure performance

    //shorten object names
    let conf = this.configuration;
    let p    = this.parameters;

    //apply primary settler
    let pst;
    if(conf.pst) pst = this.influent.primary_settler(p.fw, p.removal_BPO, p.removal_UPO, p.removal_iSS);
    else         pst = {effluent:this.influent, wastage:null};

    //chemical P removal
    if(conf.cpr==false){ p.mass_FeCl3=0; }

    //apply MLE: AS + ( NIT + (DN) )
    let as;
    if(conf.dn)       as = pst.effluent.denitrification (p.T,p.Vp,p.Rs,p.RAS,p.waste_from,p.mass_FeCl3,p.DSVI,p.A_ST,p.fq,p.SF,p.fxt,p.DO,p.pH,p.IR,p.DO_RAS,p.influent_alk);
    else if(conf.nit) as = pst.effluent.nitrification   (p.T,p.Vp,p.Rs,p.RAS,p.waste_from,p.mass_FeCl3,p.DSVI,p.A_ST,p.fq,p.SF,p.fxt,p.DO,p.pH);
    else              as = pst.effluent.activated_sludge(p.T,p.Vp,p.Rs,p.RAS,p.waste_from,p.mass_FeCl3,p.DSVI,p.A_ST,p.fq,);

    //all plant results {process_variables, streams, errors}
    console.timeEnd('>> run uct-icra plant model');
    return {
      process_variables:{
        as  : conf.dn ? as.as_process_variables  : (conf.nit ? as.as_process_variables : as.process_variables),
        nit : conf.dn ? as.nit_process_variables : (conf.nit ? as.process_variables    : null),
        dn  : conf.dn ? as.process_variables     : null,
        cpr : as.cpr,
        cap : as.cap,
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

  //static method for info
  static get info(){
    return {
      configuration:{
        pst:"Primary settler",
        as: "Activated sludge",
        nit:"Nitrification",
        dn: "Denitrification",
        cpr:"Chemical P removal",
        cap:"Capacity Estimation",
      },
      parameters:{
        fw          :{unit:"ø",         tec:"pst", descr:"fraction of Q that goes to wastage"},
        removal_BPO :{unit:"%",         tec:"pst", descr:"removal of the component X_BPO"},
        removal_UPO :{unit:"%",         tec:"pst", descr:"removal of the component X_UPO"},
        removal_iSS :{unit:"%",         tec:"pst", descr:"removal of the component X_iSS"},
        T           :{unit:"ºC",        tec:"as",  descr:"temperature"},
        Vp          :{unit:"m3",        tec:"as",  descr:"reactor volume"},
        Rs          :{unit:"d",         tec:"as",  descr:"solids retention time or sludge age"},
        RAS         :{unit:"ø",         tec:"as",  descr:"SST underflow recycle ratio"},
        waste_from  :{unit:"option",    tec:"as",  descr:"waste_from | options {'reactor','sst'}"},
        DSVI        :{unit:"mL/gTSS",   tec:"cap", descr:"sludge settleability"},
        A_ST        :{unit:"m2",        tec:"cap", descr:"area of the settler"},
        fq          :{unit:"ø",         tec:"cap", descr:"peak flow (Qmax/Qavg)"},
        mass_FeCl3  :{unit:"kg/d",      tec:"cpr", descr:"mass of FeCl3 added for chemical P removal"},
        SF          :{unit:"ø",         tec:"nit", descr:"safety factor. design choice. Moves the sludge age"},
        fxt         :{unit:"ø",         tec:"nit", descr:"current unaerated sludge mass fraction"},
        DO          :{unit:"mgO/L",     tec:"nit", descr:"DO in the aerobic reactor"},
        pH          :{unit:"ø",         tec:"nit", descr:"pH"},
        IR          :{unit:"ø",         tec:"dn",  descr:"internal recirculation ratio"},
        DO_RAS      :{unit:"mgO/L",     tec:"dn",  descr:"DO in the underflow recycle"},
        influent_alk:{unit:"mgCaCO3/L", tec:"dn",  descr:"influent alkalinity (mg/L CaCO3)"},
      },
    }
  };
}

//export class
try{module.exports=Plant}catch(e){}

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
