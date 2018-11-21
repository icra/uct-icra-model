/*
 * Technology: Chemical P removal
 * Metcalf & Eddy, Wastewater Engineering, 5th ed., 2014:
 * page 484
 */
function chem_P_removal(Q,TSS,TP,PO4,PO4_eff,FeCl3_solution,FeCl3_unit_weight,days){
  /*
    Inputs             M&EA exercise values
    ---------------------------------------
    Q                  3800  m3/d
    TSS                220   mg/L
    TP                 7     mg/L
    PO4                5     mg/L
    PO4_eff            0.1   mg/L
    FeCl3_solution     37    %
    FeCl3_unit_weight  1.35  kg/L
    days               15    days
  */
  const M_Fe = 55.845;
  const M_P  = 30.974;  //g/mol (P molecular weight)

  //  Fe_P_mole_ratio = 3.3 mole/mole (Fig 6-13, page 484, see "utils.js")
  var Fe_P_mole_ratio = get_Fe_P_mole_ratio(PO4_eff);

  /*SOLUTION*/
  //1, 2 and 3
  var Fe_III_dose   = Fe_P_mole_ratio*(PO4-PO4_eff)*M_Fe/M_P; //mg Fe/L
  var primary_eff_P = TP - (PO4 - PO4_eff);                   //mg/L
  var Fe_dose       = Q*Fe_III_dose/1000;                     //kg/d -- amount of ferric iron required per day

  //4
  var percent_Fe_in_FeCl3   = 100*M_Fe/162.3;                                                   //%
  var amount_FeCl3_solution = Fe_dose/percent_Fe_in_FeCl3*100;                                  //kg/d
  var FeCl3_volume          = amount_FeCl3_solution/(FeCl3_solution/100*FeCl3_unit_weight) ||0; //L/d
  var storage_req_15_d      = FeCl3_volume/1000*days;                                           //m3

  //5
  var Fe_dose_M        = Fe_III_dose/1000/M_Fe;           //M (mol/L)
  var P_removed        = (PO4 - PO4_eff)/1000/M_P;        //M (mol/L)
  var FeH2PO4OH_sludge = P_removed*(251)*1000;            //mg/L (251 is FeH2PO4OH molecular weight)
  var Excess_Fe_added  = Fe_dose_M - 1.6*P_removed;       //M (mol/L) (1.6 is from Fe(1.6)H2PO4OH)
  var FeOH3_sludge     = Excess_Fe_added*(106.8)*1000;    //mg/L (106.8 is FeCl3 molecular weight)
  var Excess_sludge    = FeH2PO4OH_sludge + FeOH3_sludge; //mg/L
  var Excess_sludge_kg = Q*Excess_sludge/1000;            //kg/d

  //not used (bc we are using just coprecipitation)
  //var Additional_sludge   = 0.15*TSS*Q/1000;                      //kg/d (? 0.15)
  //var Total_excess_sludge = Additional_sludge + Excess_sludge_kg; //kg/d

  //6 (not used)
  //var Raw_sludge_specific_gravity      = 1.03;
  //var Raw_sludge_moisture_content      = 94;
  //var Chemical_sludge_specific_gravity = 1.05
  //var Chemical_sludge_moisture_content = 92.5;

  //var sludge_production_wo_chemical_addition = Q*TSS*0.6/1000;                                              //kg/d (? 0.6)
  //var sludge_production_w_chemical_addition = sludge_production_wo_chemical_addition + Total_excess_sludge; //kg/d
  //7 (not used)
  //var Vs_without = sludge_production_wo_chemical_addition/(Raw_sludge_specific_gravity*1000*(1-Raw_sludge_moisture_content/100)); //m3/d
  //8 (not used)
  //var Vs = sludge_production_w_chemical_addition/(Chemical_sludge_specific_gravity*1000*(1-Chemical_sludge_moisture_content/100)); //m3/d
  /*end solution from M&EA*/

  //sludge produced in AS reactor (from G. Ekama)
  //kg/d of extra iSS produced in AS reactor
  var extra_iSS = 0.001*Q*(PO4-PO4_eff)*(251/M_P + (Fe_P_mole_ratio-1.6)*(106.8/M_P));
  return {
    Fe_P_mole_ratio:        {value:Fe_P_mole_ratio,                           unit:"moles_Fe/moles_P",  descr:"Fe/P mole ratio"},
    Fe_III_dose:            {value:Fe_III_dose,                               unit:"mg_Fe/L",           descr:"Required ferric chloride dose"},
    primary_eff_P:          {value:primary_eff_P,                             unit:"mg/L",              descr:"Primary effluent P concentration"},
    Fe_dose:                {value:Fe_dose,                                   unit:"kg/d",              descr:"Amount of ferric iron required per day"},
    percent_Fe_in_FeCl3:    {value:percent_Fe_in_FeCl3,                       unit:"%",                 descr:"Percent_Fe_in_FeCl3"},
    amount_FeCl3_solution:  {value:amount_FeCl3_solution,                     unit:"kg/d",              descr:"Amount of solution of ferric chloride required per day"},
    FeCl3_volume:           {value:FeCl3_volume,                              unit:"L/d",               descr:"Volume of FeCl3 required per day"},
    storage_req_15_d:       {value:storage_req_15_d,                          unit:"m3",                descr:"Days-storage requirement based on flowrate"},
    //Additional_sludge:      {value:Additional_sludge,                         unit:"kg/d",              descr:"Additional TSS removal resulting from the addition of FeCl3"},
    Fe_dose_M:              {value:Fe_dose_M,                                 unit:"M",                 descr:"Fe_dose_concentration"},
    P_removed:              {value:P_removed,                                 unit:"M",                 descr:"P_removed"},
    FeH2PO4OH_sludge:       {value:FeH2PO4OH_sludge,                          unit:"mg/L",              descr:"FeH2PO4OH in sludge"},
    Excess_Fe_added:        {value:Excess_Fe_added,                           unit:"M",                 descr:"Excess_Fe_added"},
    FeOH3_sludge:           {value:FeOH3_sludge,                              unit:"mg/L",              descr:"FeOH3_sludge"},
    Excess_sludge:          {value:Excess_sludge,                             unit:"mg/L",              descr:"Total chemical sludge resulting from FeCl3 addition"},
    Excess_sludge_kg:       {value:Excess_sludge_kg,                          unit:"kg_iSS/d",          descr:"Total chemical sludge resulting from FeCl3 addition in kg/d"},
    //Total_excess_sludge:    {value:Total_excess_sludge,                       unit:"kg/d",              descr:"Total excess sludge resulting from FeCl3 addition"},
    //sludge_prod_without:    {value:sludge_production_wo_chemical_addition,    unit:"kg/d",              descr:"sludge_production_without_chemical_addition"},
    //sludge_prod:            {value:sludge_production_w_chemical_addition,     unit:"kg/d",              descr:"sludge_production_with_chemical_addition"},
    //Vs_without:             {value:Vs_without,                                unit:"m3/d",              descr:"Volume of sludge without chemical precipitation"},
    //Vs:                     {value:Vs,                                        unit:"m3/d",              descr:"Volume of sludge with chemical precipitation"},
    extra_iSS:              {value:extra_iSS,                                 unit:"kg/d",              descr:"Extra iSS produced in AS reactor by coprecipitation"},
  };
}

/*test*/
(function(){
  //return;
  var Q                  = 3800
  var TSS                = 220
  var TP                 = 7
  var PO4                = 5
  var PO4_eff            = 0.1
  var FeCl3_solution     = 37
  var FeCl3_unit_weight  = 1.35
  var days               = 15
  var result = chem_P_removal(Q,TSS,TP,PO4,PO4_eff,FeCl3_solution,FeCl3_unit_weight,days);
  console.log(result);
})();

/*
  Fig 6-13, page 484
  for chem P removal technology
  Fe/P mole ratio
  "Soluble P removal by Al and Fe addition. (Adapted from Szabo et al. 2008)"
  note: implemented only for Fe(III) addition
*/
function get_Fe_P_mole_ratio(PO4_eff){
  /* Input:  Residual soluble P concentration (C_P_residual), [mg/L]
   *  -> range: 0.01, 0.1, 1, 10 (log scale)
   * Output: Fe to initial soluble P ratio, [mole/mole]
   *  -> range: 0, 1, 2, 3, 4, 5 (lineal scale)
   */
  //console.log("FIG 6-13");
  //console.log("--------");

  //rename input to "inp"
  var inp = PO4_eff || 0;

  //min and max values are: 0.01 and 10
  inp=Math.min(10,Math.max(0.01,inp));
  //console.log("PO4_eff: "+inp);

  var Figure=[
    {inp:0.01,out:8.00},
    {inp:0.02,out:4.90}, //if input is less than 0.02 is not linear
    {inp:0.03,out:4.50},
    {inp:0.04,out:4.20},
    {inp:0.05,out:3.90},
    {inp:0.06,out:3.80},
    {inp:0.07,out:3.70},
    {inp:0.08,out:3.50},
    {inp:0.09,out:3.35},
    {inp:0.10,out:3.30}, //book example has this value (0.1, 3.3)
    {inp:0.20,out:2.60},
    {inp:0.30,out:2.10},
    {inp:0.40,out:2.00},
    {inp:0.50,out:1.70},
    {inp:0.60,out:1.50},
    {inp:0.70,out:1.20},
    {inp:0.80,out:1.10},
    {inp:0.90,out:1.00},
    {inp:1.00,out:1.00}, //if input is greater than 1, it's no more linear
    {inp:2.00,out:0.20},
    {inp:3.00,out:0.10},
    {inp:4.00,out:0.10},
    {inp:5.00,out:0.01},
    {inp:6.00,out:0.01},
    {inp:7.00,out:0.005},
    {inp:8.00,out:0.001},
    {inp:9.00,out:0.001},
    {inp:10.0,out:0.0001},
  ];

  //do linear interpolation if value is not in table
  if(Figure.filter(row=>{return row.inp==inp}).length==0) {
    //console.log('value '+inp+' not in table, performing linear interpolation');

    //find inputs above and below (i_above and i_below)
    var Inps=Figure.map(row=>{return row.inp});

    for(var i=1;i<Inps.length;i++){
      if ((Inps[i-1]<inp) && (inp<Inps[i])){
        var i_below = Inps[i-1];
        var i_above = Inps[i];
        break;
      }
    }

    //find outputs above and below (o_above and o_below)
    var percentage = (inp-i_below)/(i_above-i_below);
    var o_below = Figure.filter(row=>{return row.inp==i_below})[0].out;
    var o_above = Figure.filter(row=>{return row.inp==i_above})[0].out;
    //console.log('value between '+o_below+' and '+o_above);
    var o_inter = o_below + (o_above-o_below)*percentage;
    //console.log("Fe/P mole ratio found: "+o_inter);
    //console.log("--------");
    return o_inter;
  }
  else{
    //console.log('value '+inp+' is in table');
    var out=Figure.filter(row=>{return inp==row.inp})[0].out;
    //console.log("Fe/P mole ratio found: "+out);
    //console.log("--------");
    return out;
  }
}
