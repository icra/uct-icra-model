/*
  Nitrification implementation
  from G. Ekama notes

  this function modifies the output of the activated_sludge module OR the bio_P_removal module

  input structure:
    * parameters = object
    * result     = {process_variables, effluent, wastage}
*/

//import files
try{
  State_Variables = require("./state-variables.js");
  constants       = require("./constants.js");
  require("./activated-sludge.js");
}catch(e){}

State_Variables.prototype.nitrification=function(parameters, result){
  //check undefined inputs
  if(parameters==undefined) throw new Error("parameters is undefined");
  if(result    ==undefined) throw new Error("result     is undefined");

  //check effluent and wastage
  if(result.effluent.constructor!==State_Variables) throw new Error("effluent is not a State_Variables object");
  if(result.wastage.constructor !==State_Variables) throw new Error("wastage  is not a State_Variables object");

  //unpack result from AS or BPR module
  let as_ppvv  = result.process_variables; //object
  let effluent = result.effluent;          //State_Variables object
  let wastage  = result.wastage;           //State_Variables object

  //===========================================================================
  // PARAMETERS
  //===========================================================================
  //SF: Design choice. Increases the
  //sludge age to dampen the effluent ammonia variation choose a high value for
  //high influent ammonia concentration variation
  let T   = parameters.T;   //ºC   | Temperature
  let Vp  = parameters.Vp;  //m3   | Volume of reactor
  let Rs  = parameters.Rs;  //days | Solids Retention Time or Sludge Age
  let DO  = parameters.DO;  //mg/L | DO in the aerobic reactor
  let SF  = parameters.SF;  //ø    | safety factor
  let fxt = parameters.fxt; //ø    | unaerated sludge mass fraction
  let pH  = parameters.pH;  //pH units

  //check undefined parameters
  if(SF ==undefined) throw new Error(`SF  is undefined`);
  if(fxt==undefined) throw new Error(`fxt is undefined`);
  if(pH ==undefined) throw new Error(`pH  is undefined`);

  //check variable type
  if(typeof(SF )!="number") throw new Error(`SF  is not a number`);
  if(typeof(fxt)!="number") throw new Error(`fxt is not a number`);
  if(typeof(pH )!="number") throw new Error(`pH  is not a number`);

  //numerical checks for physical sense
  if(SF  < 0) throw new Error(`Safety factor (SF=${SF}) not allowed`);
  if(fxt < 0) throw new Error(`Unaerated sludge mass fraction (fxt=${fxt}) not allowed`);

  //flowrate
  let Q = this.Q; //ML/d

  //influent fractionation
  let frac = this.totals; //object

  //nitrification starts at page 17
  //get necessary TKN fractions
  let Nti   = frac.TKN.total;           //mg/L | total TKN influent
  let Nouse = frac.TKN.usON;            //mg/L | total N_USO_influent = N_USO_effluent
  let Nobse = effluent.totals.TKN.bsON; //mg/L | total bsON (from FBSO not degraded)

  //get necessary variables from activated_sludge or bpr TODO
  let MX_T = as_ppvv.MX_T.value; //kg   | total sludge produced
  let Ns   = as_ppvv.Ns.value;   //mg/L | N required from sludge production

  //3 - nitrification kinetics
  const µAm   = constants.µAm;            //0.450 1/d | auth. max specific growth rate at 20ºC
  const ϴ_µAm = constants.theta_µAm;      //1.123 1/d | temperature correction factor
  let µAmT    = µAm*Math.pow(ϴ_µAm,T-20); //1/d       | growth rate corrected by temperature

  //correct µA by DO (book page 468)
  const K_O = constants.K_O;    //0.4 mgDO/L | nitrifier Oxygen sensitivity constant
  let µAmO  = µAmT*DO/(DO+K_O); //1/d        | growth rate corrected by temperature and DO

  //correct µA by pH inhibition
  const ϴ_pH = constants.theta_pH; //2.35 page 471 and 113
  const Ki   = constants.Ki;       //1.13 page 471 and 113
  const Kii  = constants.Kii;      //0.3  page 471 and 113
  const Kmax = constants.Kmax;     //9.5  page 471 and 113
  let µAm_pH = µAmO*Math.pow(ϴ_pH, pH-7.2)*Ki*(Kmax-pH)/(Kmax+Kii-pH); //page 471 and 113

  //kinetic constants for NIT organisms
  const YA   = constants.YA;           //0.100 gVSS/gNH4 | yield coefficient at 20ºC
  const Kn   = constants.Kn;           //1.000 mgN/L     | ammonia half saturation coefficient at 20ºC
  const ϴ_Kn = constants.theta_Kn;     //1.123 mgN/L     | Kn temperature correction factor
  let KnT    = Kn*Math.pow(ϴ_Kn,T-20); //mgN/L           | Kn corrected by temperature
  const bA   = constants.bA;           //1/d             | endogenous respiration rate at 20ºC
  const ϴ_bA = constants.theta_bA;     //ø               | bA temperature correction factor
  let bAT    = bA*Math.pow(ϴ_bA,T-20); //1/d             | bA corrected by temperature

  //page 17
  //maximum design unaerated sludge mass fraction
  let fxm = 1 - SF*(bAT+1/Rs)/µAm_pH; //ø

  //minimum sludge age for nitrification (Rsm)
  let Rsm = 1/(µAm_pH/SF*(1-fxt)-bAT); //days | reorganized equation for fxm

  //check Rsm and fxm values
  if(Rs  < Rsm) throw `Rs < Rsm: sludge retention time is below the minimum required for nitrification (Rs=${Rs}, Rsm=${Rsm})`;
  if(fxt > fxm) throw `fxt > fxm: unaerated sludge is above the maximum allowed to achieve nitrification (fxt=${fxt}, fxm=${fxm})`;

  //unaerated sludge (current and max)
  let MX_T_fxt = fxt*MX_T; //kg TSS | actual uneaerated sludge
  let MX_T_fxm = fxm*MX_T; //kg TSS | max uneaerated sludge

  //effluent ammonia nitrification
  let Nae_fxt = KnT*(bAT+1/Rs)/(µAm_pH*(1-fxt)-bAT-1/Rs); //mg/L as N | effluent ammonia concentration if fxt <  fxm
  let Nae_fxm = KnT/(SF-1);                               //mg/L as N | effluent ammonia concentration if fxt == fxm

  //2 checks for effluent ammonia concentration
  let Nae_max = Math.max(0, Nti - Ns - Nouse - Nobse); //will be 0 if Ns > Nti
  if(Nae_fxt < 0)       Nae_fxt = Nae_max;
  if(Nae_fxt > Nae_max) Nae_fxt = Nae_max;

  //effluent TKN nitrification -- page 18
  let Nte_fxt = Nae_fxt + Nouse + Nobse; //mg/L as N | effluent TKN concentration if fxt < fxm
  let Nte_fxm = Nae_fxm + Nouse + Nobse; //mg/L as N | effluent TKN concentration if fxt = fxm

  //nitrification capacity Nc
  let Nc_fxt = Math.max(0, Nti - Ns - Nte_fxt); //mg/L as N | Nitrification capacity if fxt < fxm
  let Nc_fxm = Math.max(0, Nti - Ns - Nte_fxm); //mg/L as N | Nitrification capacity if fxt = fxm
  //console.log({Nti, Ns, Nte_fxt});

  //oxygen demand
  const i_COD_NO3 = 64/14; //~4.57 gCOD/gN
  //console.log({i_COD_NO3});//debugging
  let FOn_fxt = i_COD_NO3*Q*Nc_fxt; //kgO/d | O demand if fxt < fxm
  let FOn_fxm = i_COD_NO3*Q*Nc_fxm; //kgO/d | O demand if fxt = fxm
  let FOc     = as_ppvv.FOc.value;  //kgO/d
  let FOt_fxt = FOc + FOn_fxt;      //kgO/d | total O demand if fxt < fxm
  let FOt_fxm = FOc + FOn_fxm;      //kgO/d | total O demand if fxt = fxm
  let OUR_fxt = FOt_fxt*1000/(Vp*(1-fxt)*24); //mgO/L·h
  let OUR_fxm = FOt_fxm*1000/(Vp*(1-fxm)*24); //mgO/L·h

  //page 475 4.14.22.3 book: calculate mass of nitrifiers
  let f_XBA = YA*Rs/(1+bAT*Rs);       //gVSS·d/gNH4
  let MX_BA = Q*Nc_fxt*f_XBA;         //kg VSS
  let MX_BA_perc = 100*MX_BA/MX_T||0; //% percentage of nitrifiers VSS/TSS
  let X_BA  = MX_BA/Vp;               //kgVSS/m3
  //end nitrification ---------------------

  //effluent nitrate: nitrate generated + influent
  let Nne = Nc_fxt + effluent.components.S_NOx;

  //modify state variables (effluent and wastage)
  effluent.components.S_NH4 = Nae_fxt;
  wastage .components.S_NH4 = Nae_fxt;
  effluent.components.S_NOx = Nne;
  wastage .components.S_NOx = Nne;

  //pack nitrification process variables
  let process_variables={
    µAmT     :{value:µAmT,     unit:"1/d",         descr:"Growth rate corrected by temperature"},
    µAmO     :{value:µAmO,     unit:"1/d",         descr:"Growth rate corrected by: temperature + DO available"},
    µAm_pH   :{value:µAm_pH,   unit:"1/d",         descr:"Growth rate corrected by: temperature + DO available + pH"},
    KnT      :{value:KnT,      unit:"mg/L",        descr:"Half saturation constant corrected by temperature"},
    bAT      :{value:bAT,      unit:"1/d",         descr:"Growth rate corrected by temperature"},
    f_XBA    :{value:f_XBA,    unit:"gVSS·d/gCOD", descr:"Nitrifiers Biomass production rate"},
    MX_BA    :{value:MX_BA,    unit:"kgVSS",       descr:"Mass of Nitrifiers"},
    'MX_BA_%':{value:MX_BA_perc, unit:"%",         descr:"Mass of Nitrifiers (% of TSS)"},
    X_BA     :{value:X_BA,     unit:"kgVSS/m3",    descr:"Concentration of Nitrifiers"},
    fxt      :{value:fxt,      unit:"ø",           descr:"Current unaerated sludge mass fraction"},
    fxm      :{value:fxm,      unit:"ø",           descr:"Maximum design unaerated sludge mass fraction"},
    Rs       :{value:Rs ,      unit:"d",           descr:"Current sludge age"},
    Rsm      :{value:Rsm,      unit:"d",           descr:"Minimum sludge age for nitrification (below which theoretically nitrification cannot be achiveved)"},
    //MX_T_fxt :{value:MX_T_fxt, unit:"kgTSS",       descr:"Current uneaerated sludge mass (if fxt < fxm)"},
    //MX_T_fxm :{value:MX_T_fxm, unit:"kgTSS",       descr:"Maximum design uneaerated sludge mass (if fxt = fxm)"},
    Nae      :{value:Nae_fxt,  unit:"mgN/L",       descr:"Effluent ammonia concentration (if fxt < fxm)"},
    //Nae_fxm  :{value:Nae_fxm,  unit:"mgN/L",       descr:"Effluent ammonia concentration (if fxt = fxm)"},
    Nae_max  :{value:Nae_max,  unit:"mgN/L",       descr:"Maximum possible effluent ammonia concentration"},
    //Nte      :{value:Nte_fxt,  unit:"mgN/L",       descr:"Effluent TKN concentration (if fxt < fxm)"},
    //Nte_fxm  :{value:Nte_fxm,  unit:"mgN/L",       descr:"Effluent TKN concentration (if fxt = fxm)"},
    Nc       :{value:Nc_fxt,   unit:"mgN/L",       descr:"Nitrification capacity (if fxt < fxm)"},
    //Nc_fxm   :{value:Nc_fxm,   unit:"mgN/L",       descr:"Nitrification capacity (if fxt = fxm)"},
    FOn      :{value:FOn_fxt,  unit:"kgO/d",       descr:"Nitrogenous Oxygen demand (if fxt < fxm)"},
    //FOn_fxm  :{value:FOn_fxm,  unit:"kgO/d",       descr:"Nitrogenous Oxygen demand (if fxt = fxm)"},
    FOt      :{value:FOt_fxt,  unit:"kgO/d",       descr:"Total Oxygen demand (if fxt < fxm)"},
    //FOt_fxm  :{value:FOt_fxm,  unit:"kgO/d",       descr:"Total Oxygen demand (if fxt = fxm)"},
    OUR      :{value:OUR_fxt,  unit:"mgO/L·h",     descr:"Oxygen Uptake Rate (if fxt < fxm)"},
    //OUR_fxm  :{value:OUR_fxm,  unit:"mgO/L·h",     descr:"Oxygen Uptake Rate (if fxt = fxm)"},
  };

  //hide description (debug)
  //Object.values(process_variables).forEach(obj=>delete obj.descr);
  return {
    process_variables,             //nitrification process variables
    as_process_variables: as_ppvv, //AS or BPR process variables
    effluent,                      //State_Variables object
    wastage,                       //State_Variables object
  };
};

/*test*/
(function(){
  return
  //new influent---------------(     Q, VFA, FBSO, BPO, UPO, USO, iSS,  NH4,  PO4, NOx, O2, OHO, PAO)
  let inf = new State_Variables(24.875,  50,  115, 255,  10,  45,  15, 39.1, 7.28,   0,  0,   0,   0);

  //execute AS + NIT
  let parameters = {
    T          : 16,        //ºC
    Vp         : 8473.3,    //m3
    Rs         : 15,        //days
    DO         : 2.0,       //mgO2/L
    RAS        : 1.0,       //ø
    waste_from : 'reactor', //string
    mass_FeCl3 : 3000,      //kgFeCl3/d
    SF         : 1.25,      //ø
    fxt        : 0.39,      //ø
    pH         : 7.2,       //pH units
  };
  let as       = inf.activated_sludge(parameters); //AS results
  console.log(as);
  let nit      = inf.nitrification(parameters, as); //NIT results

  //print results
  console.log("=== NIT process variables");
  console.log(nit.process_variables);
})();
