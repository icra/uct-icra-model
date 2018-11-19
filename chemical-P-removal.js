/*
 * Technology: Chemical P removal
 * Metcalf & Eddy, Wastewater Engineering, 5th ed., 2014:
 * page 484
 */

//standalone module - pre integration phase
function chemical_P_removal() {
  //example inputs
  let Q                 = 3.8;     //ML/d
  let TSS               = 220;     //mg/L
  let TP                = 7;       //mg/L
  let PO4               = 5;       //mg/L (Pse from activated-sludge.js)

  let amount_FeCl3_solution = 321.76   //kg/d
   
  const M_Fe            = 55.845;  //g/mol (Fe molecular weight)
  const M_P             = 30.974;  //g/mol (P molecular weight)
  const M_FeCl3         = 162.195; //g/mol (FeCl3 molecular weight)
  const M_FeH2PO4OH     = 251;     //g/mol (M_FeH2PO4OH molecular weight)
  const M_FeOH3         = 106.845; //g/mol (FeOH3 molecular weight)

  //let FeCl3_solution    = 37;      //%
  //let FeCl3_unit_weight = 1.35;    //kg/L
  //let FeCl3_volume      = amount_FeCl3_solution/(FeCl3_solution/100*FeCl3_unit_weight) ||0; //L/d

  let Fe_P_mole_ratio = 3.3;
  //Fe_P mole ratio = kg of iron dosed / Pse (in moles)

  //PO4 effluent
  let PO4_eff       = get_PO4_eff(Fe_P_mole_ratio); //mole/mole (Fig 6-13, page 484, see "utils.js")
  let PO4_removed   = PO4 - PO4_eff;                //mg/L
  let primary_eff_P = TP - PO4_removed;             //mg/L

  //FeCl3
  var Fe_III_dose   = Fe_P_mole_ratio*(PO4-PO4_eff)*M_Fe/M_P; //mg Fe/L
  var Fe_dose       = Q*Fe_III_dose;                          //kg/d -- amount of ferric iron required per day
  let percent_Fe_in_FeCl3   = 100*M_Fe/M_FeCl3;                                                 //%
  //let amount_FeCl3_solution = Fe_dose/percent_Fe_in_FeCl3*100;                                  //kg/d

  //5
  let Fe_dose_M        = Fe_III_dose/1000/M_Fe;               //M (mol/L)
  let P_removed        = PO4_removed/1000/M_P;                //M (mol/L)
  let FeH2PO4OH_sludge = P_removed*M_FeH2PO4OH*1000;          //mg/L
  let Excess_Fe_added  = Fe_dose_M - 1.6*P_removed;           //M (mol/L) (1.6 is from Fe(1.6)H2PO4OH)
  let FeOH3_sludge     = Excess_Fe_added*M_FeOH3*1000;        //mg/L
  let Excess_sludge    = Q*(FeH2PO4OH_sludge + FeOH3_sludge); //kgiSS/d

  let extra_iSS = Q*(PO4_removed)*(251/M_P+(Fe_P_mole_ratio-1.6)*(M_FeOH3/M_P));

  return {
    PO4_eff,
    Fe_P_mole_ratio:        {value:Fe_P_mole_ratio,                           unit:"moles_Fe/moles_P",  descr:"Fe/P mole ratio"},
    Fe_III_dose:            {value:Fe_III_dose,                               unit:"mg_Fe/L",           descr:"Required ferric chloride dose"},
    primary_eff_P:          {value:primary_eff_P,                             unit:"mg/L",              descr:"Primary effluent P concentration"},
    Fe_dose:                {value:Fe_dose,                                   unit:"kg/d",              descr:"Amount of ferric iron required per day"},
    percent_Fe_in_FeCl3:    {value:percent_Fe_in_FeCl3,                       unit:"%",                 descr:"Percent_Fe_in_FeCl3"},
    amount_FeCl3_solution:  {value:amount_FeCl3_solution,                     unit:"kg/d",              descr:"Amount of solution of ferric chloride required per day"},
    //FeCl3_volume:           {value:FeCl3_volume,                              unit:"L/d",               descr:"Volume of FeCl3 required per day"},
    //Additional_sludge:      {value:Additional_sludge,                         unit:"kg/d",              descr:"Additional TSS removal resulting from the addition of FeCl3"},
    Fe_dose_M:              {value:Fe_dose_M,                                 unit:"M",                 descr:"Fe_dose_concentration"},
    P_removed:              {value:P_removed,                                 unit:"M",                 descr:"P_removed"},
    FeH2PO4OH_sludge:       {value:FeH2PO4OH_sludge,                          unit:"mg/L",              descr:"FeH2PO4OH in sludge"},
    Excess_Fe_added:        {value:Excess_Fe_added,                           unit:"M",                 descr:"Excess_Fe_added"},
    FeOH3_sludge:           {value:FeOH3_sludge,                              unit:"mg/L",              descr:"FeOH3_sludge"},
    Excess_sludge:          {value:Excess_sludge,                             unit:"mg/L",              descr:"Total chemical sludge resulting from FeCl3 addition"},
    extra_iSS,
    //Total_excess_sludge:    {value:Total_excess_sludge,                       unit:"kg/d",              descr:"Total excess sludge resulting from FeCl3 addition"},
    //sludge_prod_without:    {value:sludge_production_wo_chemical_addition,    unit:"kg/d",              descr:"sludge_production_without_chemical_addition"},
    //sludge_prod:            {value:sludge_production_w_chemical_addition,     unit:"kg/d",              descr:"sludge_production_with_chemical_addition"},
    //Vs_without:             {value:Vs_without,                                unit:"m3/d",              descr:"Volume of sludge without chemical precipitation"},
    //Vs:                     {value:Vs,                                        unit:"m3/d",              descr:"Volume of sludge with chemical precipitation"},
    //extra_iSS:              {value:extra_iSS,                                 unit:"kg/d",              descr:"Extra iSS produced in AS reactor by coprecipitation"},
  };
}

//get PO4eff concentration from the Fe/P mole ratio
function get_PO4_eff(Fe_P_mole_ratio){
  /* Output:  Residual soluble P concentration (C_P_residual), [mg/L]
   *  -> range: 0.01, 0.1, 1, 10 (log scale)
   * Input: Fe to initial soluble P ratio, [mole/mole]
   *  -> range: 0, 1, 2, 3, 4, 5 (lineal scale)
   */

  //rename input to "inp"
  let inp = Fe_P_mole_ratio || 0;

  //min and max values are: 0.0001 and 5
  inp=Math.min(5,Math.max(0.0001,inp));

  var Figure=[
    {inp:8.00  , out:0.01},
    {inp:4.90  , out:0.02}, //if output is less than 0.02 is not linear
    {inp:4.50  , out:0.03},
    {inp:4.20  , out:0.04},
    {inp:3.90  , out:0.05},
    {inp:3.80  , out:0.06},
    {inp:3.70  , out:0.07},
    {inp:3.50  , out:0.08},
    {inp:3.35  , out:0.09},
    {inp:3.30  , out:0.10}, //book example has this value {PO4_eff:0.1, Fe_P_mole_ratio:3.3)
    {inp:2.60  , out:0.20},
    {inp:2.10  , out:0.30},
    {inp:2.00  , out:0.40},
    {inp:1.70  , out:0.50},
    {inp:1.50  , out:0.60},
    {inp:1.20  , out:0.70},
    {inp:1.10  , out:0.80},
    {inp:1.00  , out:0.90},
    {inp:1.00  , out:1.00}, //if input is greater than 1, it's no more linear
    {inp:0.20  , out:2.00},
    {inp:0.10  , out:3.00},
    {inp:0.10  , out:4.00},
    {inp:0.01  , out:5.00},
    {inp:0.01  , out:6.00},
    {inp:0.005 , out:7.00},
    {inp:0.001 , out:8.00},
    {inp:0.001 , out:9.00},
    {inp:0.0001, out:10.0},
  ];

  //do linear interpolation if value is not in table
  if(Figure.filter(row=>{return row.inp==inp}).length==0) {
    //console.log('value '+inp+' not in table, performing linear interpolation');
    //find inputs above and below (i_above and i_below)
    var Inps=Figure.map(row=>row.inp).sort();
    for(var i=1;i<Inps.length;i++){
      if ((Inps[i-1]<inp) && (inp<Inps[i])){
        var i_below = Inps[i-1];
        var i_above = Inps[i];
        break;
      }
    }
    //find outputs above and below (o_above and o_below)
    var percentage = (inp-i_below)/(i_above-i_below);
    var o_below = Figure.find(row=>{return row.inp==i_below}).out;
    var o_above = Figure.find(row=>{return row.inp==i_above}).out;
    //console.log('value between '+o_below+' and '+o_above);
    var o_inter = o_below + (o_above-o_below)*percentage;
    //console.log("PO4_eff found: "+o_inter);
    //console.log("--------");
    return o_inter;
  }else{
    //console.log('value '+inp+' is in table');
    var out=Figure.find(row=>{return inp==row.inp}).out;
    //console.log("PO4_eff found: "+out);
    //console.log("--------");
    return out;
  }
}

/*test*/
(function(){
  //return;
  console.log(chemical_P_removal());
})();

/*
Fe_P_mole_ratio:        {  value:  3.3,                     unit:  'moles_Fe/moles_P',
Fe_III_dose:            {  value:  29.153924259055984,      unit:  'mg_Fe/L',
primary_eff_P:          {  value:  2.0999999999999996,      unit:  'mg/L',
Fe_dose:                {  value:  110.78491218441273,      unit:  'kg/d',
percent_Fe_in_FeCl3:    {  value:  34.43077776750208,       unit:  '%',
amount_FeCl3_solution:  {  value:  321.7612826887067,       unit:  'kg/d',
FeCl3_volume:           {  value:  644.1667321095229,       unit:  'L/d',
Fe_dose_M:              {  value:  0.0005220507522438174,   unit:  'M',
P_removed:              {  value:  0.00015819719764964167,  unit:  'M',                 },
FeH2PO4OH_sludge:       {  value:  39.70749661006006,       unit:  'mg/L',
Excess_Fe_added:        {  value:  0.0002689352360043907,   unit:  'M',
FeOH3_sludge:           {  value:  28.734385290889126,      unit:  'mg/L',
Excess_sludge:          {  value:  68.44188190094918,       unit:  'mg/L',
Excess_sludge_kg:       {  value:  260.0791512236069,       unit:  'kg_iSS/d',
*/
