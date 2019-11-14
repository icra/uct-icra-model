/**
  *  WASTEWATER TREATMENT PLANT CLASS
  *  ================================
  *
  *  this class takes 3 objects as inputs. It has a run() method that outputs
  *  effluents, wastages, process variables and errors
  *
  *  inputs          outputs
  *  ------          -------
  *  {influent}      {primary effluent}
  *  {configuration} {secondary effluent}
  *  {parameters}    {primary wastage}
  *                  {secondary wastage}
  *                  {process variables}
  *                  {errors}
  *
  * syntax:
  *   let p = new Plant(influent, configuration, parameters)
  *   let r = p.run();
*/

/*import modules*/
try{
  State_Variables = require('./state-variables.js'); //class State_Variables
  require('./primary-settler.js');                   //State_Variables.prototype.primary_settler
  require('./activated-sludge.js');                  //State_Variables.prototype.activated_sludge
  require('./nitrification.js');                     //State_Variables.prototype.nitrification
  require('./denitrification.js');                   //State_Variables.prototype.denitrification
  require('./chemical-P-removal.js');                //function chemical P rem (in activated sludge)
  require('./bio-P-removal.js');                //function chemical P rem (in activated sludge)
}catch(e){}

class Plant{
  constructor(influent, configuration, parameters){
    /*
     * - influent:      state variables object
     * - configuration: plant configuration | dictionary of booleans {pst,nit,dn,cpr,bip}
     * - parameters:    plant parameters    | dictionary of numbers/strings (~20 aprox)
     * - constants:     kinetic constants   | dictionary of numbers (~20 aprox)
    */
    this.influent      = influent     ||new State_Variables(); //state variables object
    this.configuration = configuration||{}; //plant configuration (techs)
    this.parameters    = parameters   ||{}; //plant parameters
    this.constants     = constants    ||{}; //kinetic constants

    //check influent state variables
    if(this.influent.constructor!==State_Variables){
      throw "influent is not a State_Variables object";
    }

    //check input objects
    if(!this.constants)     throw 'Plant kinetic constants not defined';

    //check configuration: activable technologies (booleans)
    ['pst','nit','dn','cpr','bip'].forEach(key=>{
      if(this.configuration[key]===undefined){
        this.configuration[key]=false;
      }
    });

    //check influent, configuration and parameters according to static info object
    let info=Plant.info;

    //check plant parameters
    Object.keys(info.parameters).forEach(key=>{
      let type=info.parameters[key].type; //type of variable ('number','string')

      //not defined parameters: 
      //if number => 0
      //else => throw error
      if(this.parameters[key]===undefined){
        if(type=='number'){
          this.parameters[key]=0;
        }else if(key=='waste_from'){
          this.parameters.waste_from='reactor';
        }else{
          throw `Error: parameter "${key}" not defined`;
        }
      }

      //defined parameters: check type and numeric value
      else{
        //check correct type of parameter
        if(typeof(this.parameters[key])!=type){
          throw `parameter "${key}" must be a ${type}`;
        }
        if(type=='number'){
          if(this.parameters[key]<0)
            throw `Error: parameter value (${this.parameters[key]}) not allowed`;
        }
      }

    });

    //check kinetic constants
    Object.keys(constants.info).forEach(key=>{
      if(constants[key]===undefined) throw `kinetic constant "${key}" not defined`;
    });
  };

  //run the plant model
  run(debug_mode){
    console.time('>> run uct-icra model'); //measure performance

    //shorten object names
    let conf = this.configuration;
    let p    = this.parameters;

    //apply primary settler
    let pst;
    if(conf.pst) pst = this.influent.primary_settler(p.fw, p.removal_BPO, p.removal_UPO, p.removal_iSS);
    else         pst = {effluent:this.influent, wastage:null};

    //chemical P removal
    if(conf.cpr==false){ p.mass_FeCl3=0; }

    //apply bio P removal here?
    if(conf.bip){
      //TODO
      console.log("bio p removal still not implemented");
    }

    //apply MLE: AS + ( NIT + (DN) )
    let as; //activated sludge
    if(conf.dn)       as = pst.effluent.denitrification (p.T,p.Vp,p.Rs,p.RAS,p.waste_from,p.mass_FeCl3,p.DSVI,p.A_ST,p.fq,p.SF,p.fxt,p.DO,p.pH,p.IR,p.DO_RAS,p.influent_alk);
    else if(conf.nit) as = pst.effluent.nitrification   (p.T,p.Vp,p.Rs,p.RAS,p.waste_from,p.mass_FeCl3,p.DSVI,p.A_ST,p.fq,p.SF,p.fxt,p.DO,p.pH);
    else              as = pst.effluent.activated_sludge(p.T,p.Vp,p.Rs,p.RAS,p.waste_from,p.mass_FeCl3,p.DSVI,p.A_ST,p.fq,);

    //all plant results {process_variables, streams, errors}
    console.timeEnd('>> run uct-icra model');

    //pack all process variables
    let process_variables = {
      as  : conf.dn ? as.as_process_variables  : (conf.nit ? as.as_process_variables : as.process_variables),
      nit : conf.dn ? as.nit_process_variables : (conf.nit ? as.process_variables    : null),
      dn  : conf.dn ? as.process_variables     : null,
      cpr : as.cpr,
      cap : as.cap,
    };

    //debug_mode: hides descriptions making easier reading results
    if(debug_mode){
      Object.values(process_variables).forEach(pv=>{
        Object.values(pv).forEach(obj=>delete obj.descr);
      });
    }

    return{
      process_variables,
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
        as: "Activated sludge (fully aerobic)",
        nit:"Nitrification (anoxic zone)",
        dn: "Denitrification",
        cpr:"Chemical P removal",
        cap:"Capacity Estimation",
        bip:"Bio P removal",
      },
      parameters:{
        fw          :{unit:"ø",         tec:"pst", type:"number", descr:"Fraction of Q that goes to primary wastage"},
        removal_BPO :{unit:"%",         tec:"pst", type:"number", descr:"Primary settler removal of the component X_BPO"},
        removal_UPO :{unit:"%",         tec:"pst", type:"number", descr:"Primary settler removal of the component X_UPO"},
        removal_iSS :{unit:"%",         tec:"pst", type:"number", descr:"Primary settler removal of the component X_iSS"},
        T           :{unit:"ºC",        tec:"as",  type:"number", descr:"Temperature"},
        Vp          :{unit:"m3",        tec:"as",  type:"number", descr:"Reactor volume"},
        Rs          :{unit:"d",         tec:"as",  type:"number", descr:"Solids retention time or sludge age"},
        RAS         :{unit:"ø",         tec:"as",  type:"number", descr:"SST underflow recycle ratio"},
        waste_from  :{unit:"option",    tec:"as",  type:"string", descr:"Waste_from | options {'reactor','sst'}"},
        DSVI        :{unit:"mL/gTSS",   tec:"cap", type:"number", descr:"Sludge settleability"},
        A_ST        :{unit:"m2",        tec:"cap", type:"number", descr:"Area of the settler"},
        fq          :{unit:"ø",         tec:"cap", type:"number", descr:"Peak flow (Qmax/Qavg)"},
        mass_FeCl3  :{unit:"kg/d",      tec:"cpr", type:"number", descr:"Mass of FeCl3 added for chemical P removal"},
        SF          :{unit:"ø",         tec:"nit", type:"number", descr:"Safety factor. design choice. Moves the sludge age"},
        fxt         :{unit:"ø",         tec:"nit", type:"number", descr:"Current unaerated sludge mass fraction"},
        DO          :{unit:"mgO/L",     tec:"nit", type:"number", descr:"DO in the aerobic reactor"},
        pH          :{unit:"ø",         tec:"nit", type:"number", descr:"pH"},
        IR          :{unit:"ø",         tec:"dn",  type:"number", descr:"Internal recirculation ratio"},
        DO_RAS      :{unit:"mgO/L",     tec:"dn",  type:"number", descr:"DO in the underflow recycle"},
        influent_alk:{unit:"mgCaCO3/L", tec:"dn",  type:"number", descr:"Influent alkalinity (mg/L CaCO3)"},
      },
    };
  };
}

/*export module*/
try{module.exports=Plant}catch(e){}

/*unit test*/
(function(){
  return
  /* CREATE PLANT and RUN MODEL */

  /*influent state variables*/
  let influent=new State_Variables(
    //Q      VFA    FBSO   BPO    UPO    USO   
    59.0445, 50,    185.7, 707.3, 149.5, 57.5, 
    //iSS    FSA    OP     NOx    OHO    PAO
    99.83,   59.57, 14.15, 0,     0,     0
  );

  //influent mass_ratios
  influent.mass_ratios.f_CV_VFA  = 1.0667; //gCOD/gVSS
  influent.mass_ratios.f_C_VFA   = 0.4000; //gC/gVSS
  influent.mass_ratios.f_N_VFA   = 0.0000; //gN/gVSS
  influent.mass_ratios.f_P_VFA   = 0.0000; //gP/gVSS
  influent.mass_ratios.f_CV_FBSO = 1.4200; //gCOD/gVSS
  influent.mass_ratios.f_C_FBSO  = 0.4710; //gC/gVSS
  influent.mass_ratios.f_N_FBSO  = 0.0231; //gN/gVSS
  influent.mass_ratios.f_P_FBSO  = 0.0068; //gP/gVSS
  influent.mass_ratios.f_CV_BPO  = 1.5230; //gCOD/gVSS
  influent.mass_ratios.f_C_BPO   = 0.4980; //gC/gVSS
  influent.mass_ratios.f_N_BPO   = 0.0350; //gN/gVSS
  influent.mass_ratios.f_P_BPO   = 0.0054; //gP/gVSS
  influent.mass_ratios.f_CV_UPO  = 1.4810; //gCOD/gVSS
  influent.mass_ratios.f_C_UPO   = 0.5180; //gC/gVSS
  influent.mass_ratios.f_N_UPO   = 0.1000; //gN/gVSS
  influent.mass_ratios.f_P_UPO   = 0.0250; //gP/gVSS
  influent.mass_ratios.f_CV_USO  = 1.4930; //gCOD/gVSS
  influent.mass_ratios.f_C_USO   = 0.4980; //gC/gVSS
  influent.mass_ratios.f_N_USO   = 0.0258; //gN/gVSS
  influent.mass_ratios.f_P_USO   = 0.0000; //gP/gVSS
  influent.mass_ratios.f_CV_OHO  = 1.4810; //gCOD/gVSS
  influent.mass_ratios.f_C_OHO   = 0.5180; //gC/gVSS
  influent.mass_ratios.f_N_OHO   = 0.1000; //gN/gVSS
  influent.mass_ratios.f_P_OHO   = 0.0250; //gP/gVSS
  influent.mass_ratios.f_CV_PAO  = 1.4810; //gCOD/gVSS
  influent.mass_ratios.f_C_PAO   = 0.5180; //gC/gVSS
  influent.mass_ratios.f_N_PAO   = 0.1000; //gN/gVSS
  influent.mass_ratios.f_P_PAO   = 0.3800; //gP/gVSS //calculated number TBD

  //kinetic constants
  constants.YH          =    0.666; //gCOD/gCOD | heterotrophic yield (not affected by temperature)
  constants.bH          =    0.240; //1/d       | heterotrophic endogenous respiration rate at 20ºC
  constants.theta_bH    =    1.029; //ø         | bH temperature correction factor
  constants.k_v20       = 1000.000; //L/mgVSS·d | constant for not degraded bCOD (FBSO)
  constants.theta_k_v20 =    1.035; //ø         | k_v20 temperature correction factor
  constants.fH          =    0.200; //ø         | heterotrophic endogenous residue fraction
  constants.f_iOHO      =    0.150; //giSS/gVSS | iSS content of OHOs
  constants.µAm         =    0.450; //1/d       | autotrophic max specific growth rate at 20ºC
  constants.theta_µAm   =    1.123; //ø         | µAm temperature correction factor
  constants.K_O         =    0.000; //mgDO/L    | autotrophic DO µA sensitivity constant
  constants.theta_pH    =    2.350; //ø         | autotrophic pH sensitivity coefficient
  constants.Ki          =    1.130; //ø         | autotrophic pH inhibition to µA
  constants.Kii         =    0.300; //ø         | autotrophic pH inhibition to µA
  constants.Kmax        =    9.500; //ø         | autotrophic pH inhibition to µA
  constants.YA          =    0.100; //gVSS/gFSA | autotrophic yield
  constants.Kn          =    1.000; //mgN/L     | ammonia half saturation coefficient at 20ºC
  constants.theta_Kn    =    1.123; //ø         | Kn temperature correction factor
  constants.bA          =    0.040; //1/d       | autotrophic endogenous respiration rate at 20ºC
  constants.theta_bA    =    1.029; //ø         | bA temperature correction factor
  constants.K1_20       =    0.720; //gN/gVSS·d | DN K1 at 20ºC page 482 and 113
  constants.theta_K1    =    1.200; //ø         | temperature correction factor for K1_20
  constants.K2_20       =    0.101; //gN/gVSS·d | DN K2 at 20ºC page 482 and 113
  constants.theta_K2    =    1.080; //ø         | temperature correction factor for K2_20

  //plant configuration
  let configuration={
    pst : false , //primary settler
    nit : true  , //nitrification
    dn  : true  , //denitrification
    cpr : false , //chemical P removal
    bip : false , //bio P removal
  };

  //plant parameters
  let parameters={
    fw          :     0.00893, //ø       | PST | fraction of Q to pst wastage
    removal_BPO :    57.42000, //%       | PST | removal of X_BPO
    removal_UPO :    86.67000, //%       | PST | removal of X_UPO
    removal_iSS :    65.70000, //%       | PST | removal of X_iSS
    T           :    16.00000, //ºC      | AS  | temperature
    Vp          : 49844.00000, //m3      | AS  | reactor volume
    Rs          :     7.80500, //d       | AS  | solids retention time
    RAS         :     1.00000, //ø       | AS  | SST underflow recycle ratio
    DSVI        :   120.00000, //mL/gTSS | CE  | sludge settleability
    A_ST        :  4995.00000, //m2      | CE  | area of the settler
    fq          :     2.50000, //ø       | CE  | peak flow (Qmax/Qavg)
    waste_from  :   "reactor", //string  | AS  | options {'reactor','sst'}
    SF          :     1.25000, //ø       | NIT | safety factor
    fxt         :     0.27600, //ø       | NIT | unaerated sludge mass fraction
    DO          :     2.00000, //mgO/L   | NIT | DO aerobic reactor
    pH          :     7.20000, //ø       | NIT | pH
    IR          :     6.00000, //ø       | DN  | internal recirculation ratio
    DO_RAS      :     1.00000, //mgO/L   | DN  | DO in the underflow recycle
    influent_alk:   300.00000, //mg/L    | DN  | influent alkalinity (CaCO3)
    mass_FeCl3  :     0.00000, //kg/d    | CPR | daily FeCl3 mass for cpr
  };

  //create plant
  let plant = new Plant(influent, configuration, parameters);

  //run model
  let run = plant.run(debug_mode=true);

  //print results to screen
  if(run.errors.length==0){
    console.log(run.process_variables.dn);
  }else{
    console.log(run.errors);
    console.log(run.process_variables.cap);
  }
})();
