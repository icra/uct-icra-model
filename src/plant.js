/*
  WASTEWATER TREATMENT PLANT CLASS

  configuration (recycle not drawn):
  +------------------------------------------------------------------------------+
  | Qi → [Anaerobic reactor] → [Anoxic reactor] → [Aerobic reactor] → [SST] → Qe |
  |                                                      ↓                       |
  |                                                      Qw                      |
  +------------------------------------------------------------------------------+
  or
  +------------------------------------------------------------------------------+
  | Qi → [Anaerobic reactor] → [Anoxic reactor] → [Aerobic reactor] → [SST] → Qe |
  |                                                                     ↓        |
  |                                                                     Qw       |
  +------------------------------------------------------------------------------+

  the class constructor takes 3 objects as inputs. It has a run() method
  that outputs effluents, wastages and process variables.

  inputs          outputs
  ------          -------
  {influent}      {primary effluent}
  {configuration} {primary wastage}
  {parameters}    {secondary effluent}
                  {secondary wastage}
                  {process variables}
  syntax:
    let p = new Plant(influent, configuration, parameters);
    let r = p.run();
*/

/*import modules*/
try{
  State_Variables     = require('./state-variables.js'); //class State_Variables
  constants           = require("./constants.js"); //object
  capacity_estimation = require('./capacity-estimation.js'); //function
  require('./primary-settler.js');    //State_Variables.prototype.primary_settler
  require('./activated-sludge.js');   //State_Variables.prototype.activated_sludge
  require('./bio-P-removal.js');      //State_Variables.prototype.bio_P_removal
  require('./nitrification.js');      //State_Variables.prototype.nitrification
  require('./denitrification.js');    //State_Variables.prototype.denitrification

  require('./chemical-P-removal.js');          //function chemical P rem (model 1)
  require('./chemical-P-removal-improved.js'); //function chemical P rem (model 2)
}catch(e){}

class Plant{
  constructor(influent, configuration, parameters, constants){
    /*
     * - influent:      state variables object
     * - configuration: plant configuration | dictionary of booleans {pst,nit,dn,bpr}
     * - parameters:    plant parameters    | dictionary of numbers/strings (~20 aprox)
     * - constants:     kinetic constants   | dictionary of numbers
    */
    this.influent      = influent;      //influent (state variables object)
    this.configuration = configuration; //plant configuration (techs)
    this.parameters    = parameters;    //plant parameters
    this.constants     = constants;     //kinetic constants

    //check undefined inputs
    if(this.influent     ==undefined) throw new Error('influent      undefined');
    if(this.configuration==undefined) throw new Error('configuration undefined');
    if(this.parameters   ==undefined) throw new Error('parameters    undefined');
    if(this.constants    ==undefined) throw new Error('constants     undefined');

    //check influent type
    if(this.influent.constructor!==State_Variables) throw new Error("influent is not a State_Variables object");

    //check configuration: activable technologies (booleans)
    ['pst','nit','dn','bpr'].forEach(key=>{
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
          throw new Error(`parameter "${key}" not defined`);
        }
      }else{
        //defined parameters: check type
        if(typeof(this.parameters[key])!=type){
          throw new Error(`parameter "${key}" must be a ${type}`);
        }
      }
    });

    //check kinetic constants
    Object.keys(constants.info).forEach(key=>{
      if(constants[key]===undefined){
        throw new Error(`kinetic constant "${key}" not defined`);
      }
    });
  };

  //run the plant model
  run(debug_mode){
    //measure performance (start)
    console.time('>> run uct-icra model');
    let perf_start = false;
    if(typeof performance != "undefined"){
      perf_start = performance.now(); //ms
    }

    //input objects
    let config     = this.configuration;
    let parameters = this.parameters;
    constants      = this.constants;

    //check incompatible configurations
    if(config.dn && config.nit==false){
      throw new Error(`Cannot have DN without NIT`);
    }

    /*EXECUTE MODULES (PST, AS, NIT, DN, BPR)*/

    //initialize result objects
    let pst = null; //primary settler
    let as  = null; //activated sludge (aerobic)
    let nit = null; //nitrification (aerobic)
    let dn  = null; //denitrification (anoxic)
    let bpr = null; //bio P removal (anaerobic)
    let cpr = null; //chemical P removal
    let cap = null; //capacity estimation

    let cpr_v2 = null; //chemical P removal model 2

    //first step: primary settler
    if(config.pst) pst = this.influent.primary_settler(parameters);
    else           pst = {effluent:this.influent, wastage:null};

    //second step: bio P removal or activated sludge
    if(config.bpr){
      as  = null;
      bpr = pst.effluent.bio_p_removal(parameters);
    }else{
      as  = pst.effluent.activated_sludge(parameters);
      bpr = null;
    }

    //third step: get chemical P removal results (both models)
    cpr    = bpr ? bpr.cpr    : as.cpr;
    cpr_v2 = bpr ? bpr.cpr_v2 : as.cpr_v2;

    //fourth step: nitrification
    if(config.nit){
      if(config.bpr){
        nit = pst.effluent.nitrification(parameters, bpr);
      }else{
        nit = pst.effluent.nitrification(parameters, as);
      }
    }

    //fifth step: denitrification
    if(config.dn){
      dn = pst.effluent.denitrification(parameters, nit);
      //denitrification
    }

    //check BPR condition
    if(config.bpr && config.nit && config.dn==false && parameters.an_zones==0){
      if(parameters.f_AN>nit.process_variables.fxm.value){
        throw new Error(`f_AN (${parameters.f_AN})> fxm (${nit.process_variables.fxm.value})`);
      }
    }

    //sixth step: capacity estimation module
    {
      let DSVI = parameters.DSVI;
      let MX_T = bpr ? bpr.process_variables.MX_T.value : as.process_variables.MX_T.value;
      let Sti  = pst.effluent.totals.COD.total;
      let Q    = pst.effluent.Q;
      let FSti = Q*Sti;
      let L    = MX_T/FSti;
      let A_ST = parameters.A_ST;
      let VR   = parameters.Vp;
      let X_T  = MX_T/VR; //kgTSS/m3
      let fq   = parameters.fq;
      cap = capacity_estimation({Q, X_T, DSVI, L, Sti, A_ST, VR, fq}); //object
      //console.log(cap);//debug
    }

    //pack all process variables
    let process_variables={
      as  : as  ? as.process_variables  : null,
      bpr : bpr ? bpr.process_variables : null,
      cpr,
      cpr_v2,
      nit : nit ? nit.process_variables : null,
      dn  : dn  ? dn.process_variables  : null,
      cap,
    };

    let secondary_effluent = null;
    let secondary_wastage  = null;
    if(bpr){
      secondary_effluent = bpr.effluent;
      secondary_wastage  = bpr.wastage;
    }else{
      secondary_effluent = as.effluent;
      secondary_wastage  = as.wastage;
    }

    //debug_mode
    if(debug_mode){
      //hide descriptions and units
      Object.entries(process_variables).forEach(([key,pv])=>{
        if(pv==null){
          delete process_variables[key];
          return;
        }
        Object.entries(pv).forEach(([key,value])=>{
          pv[key]=value.value;
        });
      });
    }

    //measure performance (end)
    console.timeEnd('>> run uct-icra model');
    let perf = false;
    if(typeof performance != "undefined"){
      perf = performance.now() - perf_start; //ms
    }

    return{
      process_variables,
      primary:{
        effluent: pst.effluent, //primary effluent (state variables object)
        wastage : pst.wastage,  //primary wastage  (state variables object)
      },
      secondary:{
        effluent: secondary_effluent, //secondary effluent (state variables object)
        wastage : secondary_wastage,  //secondary wastage  (state variables object)
      },
      performance: perf,
    };
  };

  //static method for info
  static get info(){
    return {
      configuration:{
        pst:"Primary settler",
        as: "Activated Sludge (Aerobic)",
        bpr:"Bio P Removal (Anaerobic)",
        nit:"Nitrification (Aerobic)",
        dn: "Denitrification (Anoxic)",
        cap:"Capacity Estimation",

        cpr:   "Chemical P Removal (model 1: Metcalf&Eddy)",
        cpr_v2:"Chemical P Removal (model 2: Hass et al 2001)",
      },
      parameters:{
        fw          :{unit:"ø",         tec:"pst", type:"number", descr:"Fraction of Q going to primary wastage"},
        removal_BPO :{unit:"%",         tec:"pst", type:"number", descr:"Primary settler removal percentage of X_BPO"},
        removal_UPO :{unit:"%",         tec:"pst", type:"number", descr:"Primary settler removal percentage of X_UPO"},
        removal_iSS :{unit:"%",         tec:"pst", type:"number", descr:"Primary settler removal percentage of X_iSS"},

        T           :{unit:"ºC",        tec:"as",  type:"number", descr:"Temperature"},
        Vp          :{unit:"m3",        tec:"as",  type:"number", descr:"Volume (total process)"},
        Rs          :{unit:"d",         tec:"as",  type:"number", descr:"Solids Retention Time (SRT) or Sludge Age"},
        DO          :{unit:"mgO2/L",    tec:"as",  type:"number", descr:"Dissolved Oxygen in the Aerobic Reactor"},
        RAS         :{unit:"ø",         tec:"as",  type:"number", descr:"Sludge recycle ratio based on influent flow"},
        waste_from  :{unit:"option",    tec:"as",  type:"string", descr:"Origin of wastage. Options {'reactor','sst'}", options:['reactor','sst']},
        ideal_sst   :{unit:"ideality",  tec:"as",  type:"number", descr:"Ideality of SST (number between 0 and infinite)"},
        pH          :{unit:"ø",         tec:"as",  type:"number", descr:"pH"},

        Me          :{unit:"option",    tec:"cpr_v2", type:"string", descr:"Salt dosed for chemical P removal (FeCl3 or AlCl3)", options:['Fe','Al']},
        mass_MeCl3  :{unit:"kg/d",      tec:"cpr_v2", type:"number", descr:"Mass of FeCl3 or AlCl3 dosed for Chemical P removal"},
        a_1         :{unit:"ø",         tec:"cpr_v2", type:"number", descr:"PO4e = a_1*PO4i*exp(-a_2*Me_P_mole_ratio) calibrated parameter 1"},
        a_2         :{unit:"ø",         tec:"cpr_v2", type:"number", descr:"PO4e = a_1*PO4i*exp(-a_2*Me_P_mole_ratio) calibrated parameter 2"},

        f_AN        :{unit:"gVSS/gVSS", tec:"bpr", type:"number", descr:"Anaerobic mass fraction (must be f_AN <= fxm)"},
        an_zones    :{unit:"number",    tec:"bpr", type:"number", descr:"Number of anaerobic zones"},
        DO_RAS      :{unit:"mgO/L",     tec:"bpr", type:"number", descr:"Dissolved oxygen at RAS recycle"},
        S_NOx_RAS   :{unit:"mgNOx/L",   tec:"bpr", type:"number", descr:"NOx concentration at RAS recycle"},
        RR          :{unit:"ø",         tec:"bpr", type:"number", descr:"Recycle from anoxic to anaerobic"},

        fxt         :{unit:"gVSS/gVSS", tec:"nit", type:"number", descr:"Unaerated sludge mass fraction"},
        SF          :{unit:"ø",         tec:"nit", type:"number", descr:"Safety factor. Design choice. Increases the sludge age to dampen the effluent ammonia variation. Choose a high value for high influent ammonia concentration variation"},

        IR          :{unit:"ø",         tec:"dn",  type:"number", descr:"Internal recirculation ratio (aerobic to anoxic)"},
        DO_RAS      :{unit:"mgO/L",     tec:"dn",  type:"number", descr:"DO in the underflow recycle"},
        influent_alk:{unit:"mgCaCO3/L", tec:"dn",  type:"number", descr:"Influent alkalinity (mg/L of CaCO3)"},

        DSVI        :{unit:"mL/gTSS",   tec:"cap", type:"number", descr:"Sludge settleability"},
        A_ST        :{unit:"m2",        tec:"cap", type:"number", descr:"Area of the settler"},
        fq          :{unit:"ø",         tec:"cap", type:"number", descr:"Peak flow (Qmax/Qavg)"},
      },
    };
  };
}

/*export module*/
try{module.exports=Plant}catch(e){}

/*unit test 1: Agullana WWTP*/
(function(){
  return
  /*
     CREATE A PLANT AND RUN THE MODEL
     complete example with all inputs, parameters and constants
  */

  /*influent state variables*/
  let Q    = 0.1172667;
  let VFA  = 21.44;
  let FBSO = 113.96;
  let BPO  = 344.9832;
  let UPO  = 58.53;
  let USO  = 28.5;
  let iSS  = 8.5;
  let NH4  = 43.455
  let PO4  = 3.024;
  let NOx  = 0.076;
  let O2   = 0;
  let OHO  = 0.1;
  let PAO  = 0.1;
  //syntax                        (Q, VFA, FBSO, BPO, UPO, USO, iSS, NH4, PO4, NOx, O2, OHO, PAO)
  let influent=new State_Variables(Q, VFA, FBSO, BPO, UPO, USO, iSS, NH4, PO4, NOx, O2, OHO, PAO);

  //VSS mass ratios
    influent.mass_ratios.f_CV_VFA  = 1.0667; //gCOD/gVSS
    influent.mass_ratios.f_C_VFA   = 0.4000; //  gC/gVSS
    influent.mass_ratios.f_N_VFA   = 0.0000; //  gN/gVSS
    influent.mass_ratios.f_P_VFA   = 0.0000; //  gP/gVSS
    influent.mass_ratios.f_CV_FBSO = 1.4200; //gCOD/gVSS
    influent.mass_ratios.f_C_FBSO  = 0.4710; //  gC/gVSS
    influent.mass_ratios.f_N_FBSO  = 0.0700; //  gN/gVSS
    influent.mass_ratios.f_P_FBSO  = 0.0155; //  gP/gVSS
    influent.mass_ratios.f_CV_BPO  = 1.6800; //gCOD/gVSS
    influent.mass_ratios.f_C_BPO   = 0.4980; //  gC/gVSS
    influent.mass_ratios.f_N_BPO   = 0.0700; //  gN/gVSS
    influent.mass_ratios.f_P_BPO   = 0.0175; //  gP/gVSS
    influent.mass_ratios.f_CV_USO  = 1.8000; //gCOD/gVSS
    influent.mass_ratios.f_C_USO   = 0.4980; //  gC/gVSS
    influent.mass_ratios.f_N_USO   = 0.0700; //  gN/gVSS
    influent.mass_ratios.f_P_USO   = 0.0090; //  gP/gVSS
    influent.mass_ratios.f_CV_UPO  = 1.8000; //gCOD/gVSS
    influent.mass_ratios.f_C_UPO   = 0.5180; //  gC/gVSS
    influent.mass_ratios.f_N_UPO   = 0.0700; //  gN/gVSS
    influent.mass_ratios.f_P_UPO   = 0.0090; //  gP/gVSS
    influent.mass_ratios.f_CV_OHO  = 1.4000; //gCOD/gVSS
    influent.mass_ratios.f_C_OHO   = 0.5180; //  gC/gVSS
    influent.mass_ratios.f_N_OHO   = 0.0700; //  gN/gVSS
    influent.mass_ratios.f_P_OHO   = 0.0090; //  gP/gVSS
    influent.mass_ratios.f_CV_PAO  = 3.0000; //gCOD/gVSS
    influent.mass_ratios.f_C_PAO   = 0.5180; //  gC/gVSS
    influent.mass_ratios.f_N_PAO   = 0.0700; //  gN/gVSS
    influent.mass_ratios.f_P_PAO   = 0.3000; //  gP/gVSS

  //constants (kinetic and stoichiometric)
    constants.YH        =    0.666; //gCOD/gCOD | heterotrophic yield (not affected by temperature)
    constants.bH        =    0.240; //1/d       | heterotrophic endogenous respiration rate at 20ºC
    constants.ϴ_bH      =    1.029; //ø         | bH temperature correction factor
    constants.k_v20     =    0.070; //L/mgVSS·d | constant for not degraded bCOD (FBSO)
    constants.ϴ_k_v20   =    1.035; //ø         | k_v20 temperature correction factor
    constants.fH        =    0.200; //ø         | heterotrophic endogenous residue fraction
    constants.f_iOHO    =    0.150; //giSS/gVSS | iSS content of OHOs
    constants.µAm       =    0.450; //1/d       | autotrophic max specific growth rate at 20ºC
    constants.ϴ_µAm     =    1.123; //ø         | µAm temperature correction factor
    constants.K_O       =    0.400; //mgDO/L    | autotrophic DO µA sensitivity constant
    constants.ϴ_pH      =    2.350; //ø         | autotrophic pH sensitivity coefficient
    constants.Ki        =    1.130; //ø         | autotrophic pH inhibition to µA
    constants.Kii       =    0.300; //ø         | autotrophic pH inhibition to µA
    constants.Kmax      =    9.500; //ø         | autotrophic pH inhibition to µA
    constants.YA        =    0.100; //gVSS/gNH4 | autotrophic yield
    constants.Kn        =    1.000; //mgN/L     | ammonia half saturation coefficient at 20ºC
    constants.ϴ_Kn      =    1.123; //ø         | Kn temperature correction factor
    constants.bA        =    0.040; //1/d       | autotrophic endogenous respiration rate at 20ºC
    constants.ϴ_bA      =    1.029; //ø         | bA temperature correction factor
    constants.K1_20     =    0.720; //gN/gVSS·d | DN K1 at 20ºC page 482 and 113
    constants.ϴ_K1      =    1.200; //ø         | temperature correction factor for K1_20
    constants.K2_20     =    0.101; //gN/gVSS·d | DN K2 at 20ºC page 482 and 113
    constants.ϴ_K2      =    1.080; //ø         | temperature correction factor for K2_20
    constants.b_PAO     =    0.040; //1/d       | PAO endogenous residue respiration rate at 20ºC
    constants.ϴ_b_PAO   =    1.029; //ø         | b_PAO temperature correction factor
    constants.f_PAO     =    0.250; //ø         | PAO endogenous residue fraction
    constants.f_P_iSS   =    0.020; //gP/giSS   | fraction of P in iSS
    constants.f_iPAO    =    1.300; //giSS/gVSS | fraction of iSS in PAO
    constants.f_PO4_rel =    0.500; //gP/gCOD   | ratio of P release/VFA uptake (1molP/1molCOD)
    constants.K2_20_PAO =    0.255; //gN/gVSS·d | at 20ºC page 482 and 113
    constants.ϴ_K2_PAO  =    1.080; //ø         | temperature correction factor for K2_20

  //plant configuration
  let configuration={
    pst: false, //primary settler
    bpr: true, //bio P removal
    nit: true, //nitrification
    dn : true, //denitrification
  };

  //plant parameters
  let parameters={
    fw          :     0.00893, //ø       | PST | fraction of Q to pst wastage
    removal_BPO :    57.42000, //%       | PST | removal of X_BPO
    removal_UPO :    86.67000, //%       | PST | removal of X_UPO
    removal_iSS :    65.70000, //%       | PST | removal of X_iSS

    T           :    25.26000, //ºC      | AS  | temperature
    Vp          :   190.00000, //m3      | AS  | reactor volume
    Rs          :    17.50000, //d       | AS  | solids retention time
    DO          :     1.00000, //mgO/L   | AS  | DO aerobic reactor
    RAS         :     0.70000, //ø       | AS  | SST underflow recycle ratio
    waste_from  :       "sst", //string  | AS  | options {'reactor','sst'}
    ideal_sst   :     1.00000, //number  | SST | number between 0 and infinite (ideality of SST)

    mass_MeCl3  :     0.00000, //kg/d    | CPR | daily FeCl3 mass for cpr
    Me          :        "Fe", //string  | CPR2| metal used
    a_1         :     1.00000, //ø       | CPR2| calibrated value 1
    a_2         :     0.00000, //ø       | CPR2| calibrated value 2

    SF          :     1.25000, //ø       | NIT | safety factor
    fxt         :     0.45000, //ø       | NIT | unaerated sludge mass fractio5
    pH          :     7.09000, //ø       | NIT | pH
    IR          :     248.000, //ø       | DN  | internal recirculation ratio
    DO_RAS      :     0.00000, //mgO/L   | DN  | DO in the underflow recycle
    influent_alk:  1095.00000, //mg/L    | DN  | influent alkalinity (CaCO3)
    S_NOx_RAS   :     0.00000, //mgNOx/L | BPR
    f_AN        :     0.80000, //ø       | BPR
    an_zones    :     1.00000, //an zones| BPR
    RR          :   400.00000, //        | BPR

    DSVI        :   182.00000, //mL/gTSS | CE  | sludge settleability
    A_ST        :    20.40000, //m2      | CE  | area of the settler
    fq          :     3.70000, //ø       | CE  | peak flow (Qmax/Qavg)
  };

  //new Plant          (influent, configuration, parameters, constants)
  let plant = new Plant(influent, configuration, parameters, constants);

  //run model and log results
  let results = plant.run(debug_mode=true);
  console.log(results)
  console.log('effluent:')
  console.log(results.secondary.effluent.summary)
  console.log('wastage:')
  console.log(results.secondary.wastage.summary)
})();

/*unit test 2: St Sadurni WWTP*/
(function(){
  return
  /*
     CREATE A PLANT AND RUN THE MODEL
     complete example with all inputs, parameters and constants
  */

  /*influent state variables*/
  let Q    = 2.845;
  let VFA  = 50;
  let FBSO = 116.5;
  let BPO  = 239.67
  let UPO  = 300;
  let USO  = 43.5;
  let iSS  = 50;
  let NH4  = 40;
  let PO4  = 7;
  let NOx  = 1;
  let O2   = 0;
  let OHO  = 0.1;
  let PAO  = 0;
  //syntax                        (Q, VFA, FBSO, BPO, UPO, USO, iSS, NH4, PO4, NOx, O2, OHO, PAO)
  let influent=new State_Variables(Q, VFA, FBSO, BPO, UPO, USO, iSS, NH4, PO4, NOx, O2, OHO, PAO);

  //VSS mass ratios
    influent.mass_ratios.f_CV_VFA  = 1.0667; //gCOD/gVSS
    influent.mass_ratios.f_C_VFA   = 0.4000; //  gC/gVSS
    influent.mass_ratios.f_N_VFA   = 0.0000; //  gN/gVSS
    influent.mass_ratios.f_P_VFA   = 0.0000; //  gP/gVSS
    influent.mass_ratios.f_CV_FBSO = 1.4200; //gCOD/gVSS
    influent.mass_ratios.f_C_FBSO  = 0.4710; //  gC/gVSS
    influent.mass_ratios.f_N_FBSO  = 0.0464; //  gN/gVSS
    influent.mass_ratios.f_P_FBSO  = 0.0118; //  gP/gVSS
    influent.mass_ratios.f_CV_BPO  = 1.5230; //gCOD/gVSS
    influent.mass_ratios.f_C_BPO   = 0.4980; //  gC/gVSS
    influent.mass_ratios.f_N_BPO   = 0.0323; //  gN/gVSS
    influent.mass_ratios.f_P_BPO   = 0.0072; //  gP/gVSS
    influent.mass_ratios.f_CV_USO  = 1.4930; //gCOD/gVSS
    influent.mass_ratios.f_C_USO   = 0.4980; //  gC/gVSS
    influent.mass_ratios.f_N_USO   = 0.0366; //  gN/gVSS
    influent.mass_ratios.f_P_USO   = 0.0000; //  gP/gVSS
    influent.mass_ratios.f_CV_UPO  = 1.4810; //gCOD/gVSS
    influent.mass_ratios.f_C_UPO   = 0.5180; //  gC/gVSS
    influent.mass_ratios.f_N_UPO   = 0.1000; //  gN/gVSS
    influent.mass_ratios.f_P_UPO   = 0.0250; //  gP/gVSS
    influent.mass_ratios.f_CV_OHO  = 1.4810; //gCOD/gVSS
    influent.mass_ratios.f_C_OHO   = 0.5180; //  gC/gVSS
    influent.mass_ratios.f_N_OHO   = 0.1000; //  gN/gVSS
    influent.mass_ratios.f_P_OHO   = 0.0250; //  gP/gVSS
    influent.mass_ratios.f_CV_PAO  = 1.4810; //gCOD/gVSS
    influent.mass_ratios.f_C_PAO   = 0.5180; //  gC/gVSS
    influent.mass_ratios.f_N_PAO   = 0.1000; //  gN/gVSS
    influent.mass_ratios.f_P_PAO   = 0.3800; //  gP/gVSS

  //constants (kinetic and stoichiometric)
    constants.YH        =    0.666; //gCOD/gCOD | heterotrophic yield (not affected by temperature)
    constants.bH        =    0.240; //1/d       | heterotrophic endogenous respiration rate at 20ºC
    constants.ϴ_bH      =    1.029; //ø         | bH temperature correction factor
    constants.k_v20     =    1.000; //L/mgVSS·d | constant for not degraded bCOD (FBSO)
    constants.ϴ_k_v20   =    1.035; //ø         | k_v20 temperature correction factor
    constants.fH        =    0.200; //ø         | heterotrophic endogenous residue fraction
    constants.f_iOHO    =    0.150; //giSS/gVSS | iSS content of OHOs
    constants.µAm       =    0.550; //1/d       | autotrophic max specific growth rate at 20ºC
    constants.ϴ_µAm     =    1.123; //ø         | µAm temperature correction factor
    constants.K_O       =    0.400; //mgDO/L    | autotrophic DO µA sensitivity constant
    constants.ϴ_pH      =    2.350; //ø         | autotrophic pH sensitivity coefficient
    constants.Ki        =    1.130; //ø         | autotrophic pH inhibition to µA
    constants.Kii       =    0.300; //ø         | autotrophic pH inhibition to µA
    constants.Kmax      =    9.500; //ø         | autotrophic pH inhibition to µA
    constants.YA        =    0.100; //gVSS/gNH4 | autotrophic yield
    constants.Kn        =    1.000; //mgN/L     | ammonia half saturation coefficient at 20ºC
    constants.ϴ_Kn      =    1.123; //ø         | Kn temperature correction factor
    constants.bA        =    0.040; //1/d       | autotrophic endogenous respiration rate at 20ºC
    constants.ϴ_bA      =    1.029; //ø         | bA temperature correction factor
    constants.K1_20     =    0.720; //gN/gVSS·d | DN K1 at 20ºC page 482 and 113
    constants.ϴ_K1      =    1.200; //ø         | temperature correction factor for K1_20
    constants.K2_20     =    0.101; //gN/gVSS·d | DN K2 at 20ºC page 482 and 113
    constants.ϴ_K2      =    1.080; //ø         | temperature correction factor for K2_20
    constants.b_PAO     =    0.040; //1/d       | PAO endogenous residue respiration rate at 20ºC
    constants.ϴ_b_PAO   =    1.029; //ø         | b_PAO temperature correction factor
    constants.f_PAO     =    0.250; //ø         | PAO endogenous residue fraction
    constants.f_P_iSS   =    0.020; //gP/giSS   | fraction of P in iSS
    constants.f_iPAO    =    1.300; //giSS/gVSS | fraction of iSS in PAO
    constants.f_PO4_rel =    0.500; //gP/gCOD   | ratio of P release/VFA uptake (1molP/1molCOD)
    constants.K2_20_PAO =    0.255; //gN/gVSS·d | at 20ºC page 482 and 113
    constants.ϴ_K2_PAO  =    1.080; //ø         | temperature correction factor for K2_20

  //plant configuration
  let configuration={
    pst: true, //primary settler
    bpr: true, //bio P removal
    nit: true, //nitrification
    dn : true, //denitrification
  };

  //plant parameters
  let parameters={
    fw          :     0.00500, //ø       | PST | fraction of Q to pst wastage
    removal_BPO :    78.00000, //%       | PST | removal of X_BPO
    removal_UPO :    80.00000, //%       | PST | removal of X_UPO
    removal_iSS :    99.00000, //%       | PST | removal of X_iSS

    T           :    22.00000, //ºC      | AS  | temperature
    Vp          :  6000.00000, //m3      | AS  | reactor volume
    Rs          :    27.00000, //d       | AS  | solids retention time
    DO          :     1.00000, //mgO/L   | AS  | DO aerobic reactor
    RAS         :     1.27530, //ø       | AS  | SST underflow recycle ratio
    waste_from  :       "sst", //string  | AS  | options {'reactor','sst'}
    ideal_sst   :     1.00000, //number  | SST | number between 0 and infinite (ideality of SST)

    mass_MeCl3  :    23.33300, //kg/d    | CPR | daily FeCl3 mass for cpr
    Me          :        "Fe", //string  | CPR2| metal used
    a_1         :     1.00000, //ø       | CPR2| calibrated value 1
    a_2         :     0.20000, //ø       | CPR2| calibrated value 2

    SF          :     1.25000, //ø       | NIT | safety factor
    fxt         :     0.60000, //ø       | NIT | unaerated sludge mass fractio5
    pH          :     7.20000, //ø       | NIT | pH
    IR          :    56.48000, //ø       | DN  | internal recirculation ratio
    DO_RAS      :     1.00000, //mgO/L   | DN  | DO in the underflow recycle
    influent_alk:   270.00000, //mg/L    | DN  | influent alkalinity (CaCO3)

    S_NOx_RAS   :     1.82000, //mgNOx/L | BPR
    f_AN        :     0.10000, //ø       | BPR
    an_zones    :     0.10000, //an zones| BPR
    RR          :     0.00000, //        | BPR

    DSVI        :   220.00000, //mL/gTSS | CE  | sludge settleability
    A_ST        :   380.00000, //m2      | CE  | area of the settler
    fq          :     2.40000, //ø       | CE  | peak flow (Qmax/Qavg)
  };

  //new Plant          (influent, configuration, parameters, constants)
  let plant = new Plant(influent, configuration, parameters, constants);

  //run model and log results
  let results = plant.run(debug_mode=true);
  console.log("ST SADURNÍ:");
  console.log(results.process_variables);
  console.log('effluent:')
  console.log(results.secondary.effluent.summary)
  console.log('1ry wastage:')
  console.log(results.primary.wastage.summary)
  console.log('2ndary wastage:')
  console.log(results.secondary.wastage.summary)
})();
