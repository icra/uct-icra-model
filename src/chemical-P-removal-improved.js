/*
  Chemical P Removal model (improved)

  Formulas extracted from Haas D.W., Wentzel M.C., Ekama G.A. "The use of
  simultaneous chemical precipitation in modified activated sludge systems
  exhibiting biological excess phosphate removal". Part 6: Modelling of
  simultaneous chemical-biological P removal – Review of existing models
  (2001). Water SA. 27(2), 135 – 150.  Some other information extracted from
  D.W., Wentzel M.C., Ekama G.A. "The use of simultaneous chemical
  precipitation in modified activated sludge systems exhibiting biological
  excess phosphate removal". Part 7: Application of the IAWQ model (2001).
  Water SA. 27(2), 151 – 168.
*/

function chemical_P_removal_improved(parameters){
  //parameters
  let Q          = parameters.Q;          //ML/d  | influent flowrate
  let PO4i       = parameters.PO4i;       //mgP/L | PO4 available for precipitation ("Psa")
  let pH         = parameters.pH;         //pH units
  let mass_MeCl3 = parameters.mass_MeCl3; //kg/d | mass of MeCl3 added daily
  let Me         = parameters.Me;         //string: metal used for precipitation: "Fe" or "Al"
  let a_1        = parameters.a_1;        //calibrated value 1
  let a_2        = parameters.a_2;        //calibrated value 2

  //adapt for previous module version nomenclature
  if(typeof parameters.mass_FeCl3 == 'number'){
    if(!mass_MeCl3) mass_MeCl3 = parameters.mass_FeCl3;
    if(!Me)         Me         = 'Fe';
    if(!a_1)        a_1        = 0.9488571429; //calibrated value 1
    if(!a_2)        a_2        = 0.9740000000; //calibrated value 2
  }

  //input checks
  Object.entries({Q,PO4i,pH,Me,mass_MeCl3,a_1,a_2}).forEach(([key,val])=>{
    if(val==undefined){
      throw new Error(`${key} is undefined`);
    }
  });

  if(Q          <= 0) throw new Error(`Value of Flowrate (Q=${Q}) not allowed`);
  if(PO4i       <  0) throw new Error(`Value of Input PO4 (PO4i=${PO4i}) not allowed`);
  if(mass_MeCl3 <  0) throw new Error(`Value of Mass of MeCl3 (mass_MeCl3=${mass_MeCl3}) not allowed`);
  if(['Fe','Al'].indexOf(Me)==-1) throw new Error(`Metal used has to be 'Fe' or 'Al'. '${Me}' not allowed`);

  //ALL MOLECULAR WEIGHTS
  const M_P     =  30.974; //g/mol (P  molecular weight)
  const M_Fe    =  55.845; //g/mol (Fe molecular weight)
  const M_Al    =  26.982; //g/mol (Al molecular weight)
  const M_FeCl3 = 162.195; //g/mol (FeCl3 molecular weight)
  const M_AlCl3 = 133.332; //g/mol (AlCl3 molecular weight)
  const M_FeOH3 = 106.866; //g/mol (FeOH3 molecular weight)
  const M_AlOH3 =  78.003; //g/mol (AlOH3 molecular weight)
  const M_FePO4 = 150.815; //g/mol (FePO4 molecular weight)
  const M_AlPO4 = 121.952; //g/mol (AlPO4 molecular weight)

  //molecular weights used for current metal ('Fe' or 'Al')
  const M_Me    = {'Fe': M_Fe,    'Al': M_Al   }[Me];
  const M_MeCl3 = {'Fe': M_FeCl3, 'Al': M_AlCl3}[Me];
  const M_MeOH3 = {'Fe': M_FeOH3, 'Al': M_AlOH3}[Me];
  const M_MePO4 = {'Fe': M_FePO4, 'Al': M_AlPO4}[Me];

  //compute moles of influent P
  let moles_P = Q*PO4i*1000/M_P; //molesP/d

  //convert kg/d of MeCl3 to moles of Me
  let moles_Me = mass_MeCl3*1000/M_MeCl3; //moles/d Me dosed

  //compute Me/P mole ratio
  let Me_P_mole_ratio = moles_Me/moles_P || 0; //mol_Me/mol_P

  //get residual P after precipitation of MePO4
  let P_R = a_1*PO4i*Math.exp(-a_2*Me_P_mole_ratio); //mgP/L

  //table 1. equilibrium relationships and constants used by Briggs (1996)
  //formula => k_x = 10^(-pK)
  let table_1 = {
    k_p1:    { Al: Math.pow(10,  -2.1 ), Fe: Math.pow(10,  -2.1 ) },
    k_p2:    { Al: Math.pow(10,  -7.2 ), Fe: Math.pow(10,  -7.2 ) },
    k_p3:    { Al: Math.pow(10, -12.3 ), Fe: Math.pow(10, -12.3 ) },
    k_MHP:   { Al: Math.pow(10,   6.0 ), Fe: Math.pow(10,  17.5 ) },
    k_Me1:   { Al: Math.pow(10,  -5.0 ), Fe: Math.pow(10,  -3.0 ) },
    k_Me2:   { Al: Math.pow(10,  -8.7 ), Fe: Math.pow(10,  -6.4 ) },
    k_Me3:   { Al: Math.pow(10, -15.2 ), Fe: Math.pow(10, -13.5 ) },
    k_Me4:   { Al: Math.pow(10, -23.3 ), Fe: Math.pow(10, -23.5 ) },
    K_MePO4: { Al: Math.pow(10, -21.69), Fe: Math.pow(10, -28.75) }, //from table 2
    K_MeOH3: { Al: Math.pow(10, -32.3 ), Fe: Math.pow(10, -38.2 ) }, //from table 2
  };

  //constants for current metal
  let k_p1    = table_1.k_p1[Me];
  let k_p2    = table_1.k_p2[Me];
  let k_p3    = table_1.k_p3[Me];
  let k_MHP   = table_1.k_MHP[Me];
  let k_Me1   = table_1.k_Me1[Me];
  let k_Me2   = table_1.k_Me2[Me];
  let k_Me3   = table_1.k_Me3[Me];
  let k_Me4   = table_1.k_Me4[Me];
  let K_MePO4 = table_1.K_MePO4[Me];
  let K_MeOH3 = table_1.K_MeOH3[Me];

  //concentrations
  let OH      = Math.pow(10,-14+pH);        //[OH-]    mol/L
  let H       = Math.pow(10,-pH);           //[H+]     mol/L
  let Me_conc = K_MeOH3/(OH*OH*OH);         //[Me3+]   mol/L
  let PO4     = K_MePO4/K_MeOH3*(OH*OH*OH); //[PO4,3-] mol/L

  //absolute minimum P residual at any given pH
  let P_RES = 1000 * M_P * PO4 * (1 + H    /k_p3 +
                                      H*H  /(k_p2*k_p3)*(1 + k_MHP*Me_conc) +
                                      H*H*H/(k_p1*k_p2*k_p3)
  );

  //get PO4 effluent and PO4 removed
  let PO4e = Math.max(P_R, P_RES);   //mgP/L
  PO4e     = Math.min(PO4i, PO4e);   //ensure PO4e < PO4i
  let PO4_removed = Q*(PO4i - PO4e); //kgP/d

  //calculate extra_iSS generated by precipitation
  let Me_T = 1000 * M_Me * Me_conc * (1 + k_Me1/H         +
                                          k_Me2/(H*H)     +
                                          k_Me3/(H*H*H)   +
                                          k_Me4/(H*H*H*H) +
                                          k_MHP*PO4*(H*H) / (k_p2*k_p3)
  );
  let X_MeP     = M_MePO4/M_P*(PO4i - PO4e);                           //mg/L   | metal hydroxy-phosphate formed
  let Me_0      = M_Me/M_MeCl3*mass_MeCl3/Q;                           //mgMe/L | initial metal conc dosed
  let X_MeH     = M_MeOH3/M_Me*(Me_0 - M_Me/M_P*(PO4i - PO4e) - Me_T); //mg/L   | metal hydroxide formed
  let extra_iSS = Q*(X_MeP + X_MeH);                                   //kg/d   | extra iSS formed

  //return cpr process variables
  let results={}; //new empty object
  results[`${Me}_P_mole_ratio`] = {value:Me_P_mole_ratio, unit:`mol${Me}/molP`, descr:`${Me}/P mole ratio`};
  results.PO4i                  = {value:PO4i,            unit:"mgP/L",         descr:"PO4 available for precipitation"};
  results.PO4e                  = {value:PO4e,            unit:"mgP/L",         descr:"PO4 effluent"};
  results.PO4_removed           = {value:PO4_removed,     unit:"kgP/d",         descr:"P removed by chemical P removal"};
  results.extra_iSS             = {value:extra_iSS,       unit:"kgiSS/d",       descr:"extra iSS formed by chemical P removal"};
  return results;
};

//export function
try{module.exports=chemical_P_removal_improved;}catch(e){}

/*standalone test*/
(function(){
  return
  let Q    = 0.5914;       //ML/d
  let PO4i = 2.8;          //mg/L
  let pH   = 7.2;          //pH units
  let Me   = 'Fe';         //string
  let a_1  = 0.9488571429; //calibrated value 1
  let a_2  = 0.9740000000; //calibrated value 2

  //kg/d of FeCl3 dosed
  [33.1184, 26.0216, 21.2904, 16.5592, 11.828, 9.4624, 4.7312].forEach(mass_MeCl3 => {
    let cpr = chemical_P_removal_improved({Q, PO4i, mass_MeCl3, Me, pH, a_1, a_2});
    Object.keys(cpr).forEach(key=>{ cpr[key]=cpr[key].value; });
    console.log({mass_MeCl3, cpr});
  });
})();
