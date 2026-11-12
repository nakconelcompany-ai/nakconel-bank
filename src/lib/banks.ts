/**
 * Bank directory used by the transfer bank picker.
 * This is a curated directory, not a guarantee that every institution is
 * reachable through a live payout rail. Provider-supported recipients must
 * be validated by the transfer provider before a real transfer is submitted.
 */
export type Bank = {
  code: string;
  name: string;
  short: string;
  color: string;
  country: string;
  logoUrl: string;
  flag?: string;
  category?: 'commercial' | 'digital' | 'payment-service' | 'mobile-money' | 'credit-union';
};

type BankRow = [code: string, name: string, short: string, color: string, domain: string, country: string, category?: Bank['category']];

const makeBanks = (rows: BankRow[]): Bank[] => rows.map(([code, name, short, color, domain, country, category = 'commercial']) => ({
  code, name, short, color, country, category,
  // Bank/brand favicon served by Google's favicon endpoint; initials remain
  // available in the UI if a bank has no published favicon.
  logoUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
}));

/** Nigerian naira banks and regulated payment providers. */
export const NG_BANKS: Bank[] = makeBanks([
  ['058','Guaranty Trust Bank (GTBank)','GT','#E35205','gtbank.com','NG'],
  ['033','United Bank for Africa (UBA)','UBA','#D32F2F','ubagroup.com','NG'],
  ['011','First Bank of Nigeria','FBN','#003B70','firstbanknigeria.com','NG'],
  ['057','Zenith Bank','ZEN','#ED1C24','zenithbank.com','NG'],
  ['032','Union Bank of Nigeria','UBN','#00A651','unionbankng.com','NG'],
  ['044','Access Bank','ACC','#F7941D','accessbankplc.com','NG'],
  ['050','Ecobank Nigeria','ECO','#0066B3','ecobank.com','NG'],
  ['070','Fidelity Bank','FID','#7B2D8E','fidelitybank.ng','NG'],
  ['221','Stanbic IBTC Bank','SIB','#0033A0','stanbicibtc.com','NG'],
  ['232','Sterling Bank','STB','#E31C23','sterling.ng','NG'],
  ['076','Polaris Bank','POL','#6B2D8B','polarismfb.com','NG'],
  ['082','Keystone Bank','KEY','#00A651','keystonebankng.com','NG'],
  ['214','First City Monument Bank (FCMB)','FCMB','#8B1A4A','fcmb.com','NG'],
  ['035','Wema Bank','WMA','#8B008B','wemabank.com','NG'],
  ['068','Standard Chartered Bank Nigeria','SCB','#0072AA','sc.com/ng','NG'],
  ['023','Citibank Nigeria','CITI','#003B70','citigroup.com','NG'],
  ['301','Jaiz Bank','JAIZ','#00843D','jaizbankplc.com','NG'],
  ['100','SunTrust Bank','SUN','#F58220','suntrustng.com','NG'],
  ['102','Titan Trust Bank','TITAN','#1A3C70','titantrustbank.com','NG'],
  // Additional CBN-listed commercial and non-interest banks
  ['globus','Globus Bank','GLOBUS','#006A4E','globusbank.com','NG'],
  ['unity','Unity Bank','UNITY','#E31C23','unitybankng.com','NG'],
  ['providus','Providus Bank','PROV','#003B70','providusbank.com','NG'],
  ['parallex','Parallex Bank','PARA','#0066B3','parallexbank.com','NG'],
  ['premiumtrust','Premium Trust Bank','PTB','#003B70','premiumtrustbank.com','NG'],
  ['signature','Signature Bank','SIG','#00843D','signaturebankng.com','NG'],
  ['lotus','Lotus Bank','LOTUS','#00843D','lotusbank.com','NG'],
  ['taj','TAJBank','TAJ','#00A651','tajbank.com','NG'],
  ['alternative','The Alternative Bank','ALT','#6B2D8B','altbank.ng','NG'],
  ['optimus','Optimus Bank','OPT','#003B70','optimusbank.com','NG'],
  ['alphamorgan','Alpha Morgan Bank','ALPHA','#006A4E','alphamorganbank.com','NG'],
  ['nova','Nova Commercial Bank','NOVA','#003B70','novabank.com.ng','NG'],
  // Merchant banks offering naira banking services
  ['coronation','Coronation Merchant Bank','CORO','#8B1A4A','coronationmb.com','NG'],
  ['fbnquest','FBNQuest Merchant Bank','FBNQ','#003B70','fbnquest.com','NG'],
  ['fsdh','FSDH Merchant Bank','FSDH','#006A4E','fsdhgroup.com','NG'],
  ['greenwich','Greenwich Merchant Bank','GMB','#003B70','greenwichbankgroup.com','NG'],
  ['rand','Rand Merchant Bank Nigeria','RMB','#003B70','rmb.com.ng','NG'],
  ['999','OPay','OP','#00C853','opayweb.com','NG'],
  ['998','PalmPay','PP','#7B2CBF','palmpay.com','NG'],
  ['997','Kuda','KUD','#40196D','kuda.com','NG'],
  ['996','Moniepoint','MP','#0066FF','moniepoint.com','NG'],
  ['995','Paga','PAGA','#F15A24','paga.com','NG'],
  ['994','VFD Microfinance Bank','VFD','#00AEEF','vbank.ng','NG','digital'],
  ['120001','9 Payment Service Bank','9PSB','#00AEEF','9psb.com.ng','NG','payment-service'],
  ['120002','Hope Payment Service Bank','HOPE','#00A651','hopepsbank.com','NG','payment-service'],
  ['120003','MOMO Payment Service Bank','MOMO','#FFC72C','momoagent.com.ng','NG','payment-service'],
  ['946','MoneyMaster Payment Service Bank','MM','#003B70','moneymaster.com.ng','NG','payment-service'],
  ['120004','SmartCash Payment Service Bank','SMART','#E31C23','smartcashpsb.ng','NG','payment-service'],
  ['kuda-mfb','Kuda Microfinance Bank','KUD','#40196D','kuda.com','NG','digital'],
  ['moniepoint-mfb','Moniepoint Microfinance Bank','MP','#0066FF','moniepoint.com','NG','digital'],
  ['opay-mfb','OPay Microfinance Bank','OP','#00C853','opayweb.com','NG','digital'],
  ['palmpay-mfb','PalmPay','PP','#7B2CBF','palmpay.com','NG','digital'],
  ['fairmoney-mfb','FairMoney Microfinance Bank','FM','#00AEEF','fairmoney.io','NG','digital'],
  ['rubies-mfb','Rubies Microfinance Bank','RUB','#7B2CBF','rubiesbank.com','NG','digital'],
  ['sparkle-mfb','Sparkle Microfinance Bank','SPK','#6B2D8B','sparkle.ng','NG','digital'],
  ['paga-wallet','Paga','PAGA','#F15A24','paga.com','NG','mobile-money'],
]);

/** Banks grouped by the country that issues the selected currency. */
export const INTL_BANKS: Record<string, Bank[]> = {
  US: makeBanks([
    ['chase','JPMorgan Chase','Chase','#005DAA','chase.com','US'],
    ['bofa','Bank of America','BofA','#E31837','bankofamerica.com','US'],
    ['wells','Wells Fargo','WF','#D71E28','wellsfargo.com','US'],
    ['citi','Citibank','Citi','#003B6F','citi.com','US'],
    ['usbk','U.S. Bank','USB','#002855','usbank.com','US'],
    ['pnc','PNC Bank','PNC','#E57200','pnc.com','US'],
    ['capitalone','Capital One','CO','#004977','capitalone.com','US'],
    ['tdus','TD Bank','TD','#54B848','td.com','US'],
    ['ally','Ally Bank','Ally','#6E1E7D','ally.com','US','digital'],
    ['citizens','Citizens Bank','CIT','#007A53','citizensbank.com','US'],
    ['truist','Truist Bank','TRU','#4B2683','truist.com','US'],
    ['regions','Regions Bank','REG','#007A53','regions.com','US'],
    ['fifththird','Fifth Third Bank','53','#006A4E','53.com','US'],
    ['huntington','Huntington National Bank','HNB','#00843D','huntington.com','US'],
    ['keybank','KeyBank','KEY','#E31C23','key.com','US'],
    ['mtbank','M&T Bank','MT','#006A4E','mtb.com','US'],
    ['bmo_us','BMO Bank','BMO','#0079C1','bmo.com','US'],
    ['synchrony','Synchrony Bank','SYN','#003B70','synchrony.com','US','digital'],
    ['discover','Discover Bank','DISC','#FF6600','discover.com','US'],
    ['usaa','USAA','USAA','#003B70','usaa.com','US'],
    ['navyfederal','Navy Federal Credit Union','NFCU','#0066A4','navyfederal.org','US','credit-union'],
  ]),
  GB: makeBanks([
    ['barclays','Barclays','BARC','#00AEEF','barclays.co.uk','GB'],
    ['hsbc','HSBC UK','HSBC','#DB0011','hsbc.co.uk','GB'],
    ['lloyds','Lloyds Bank','LLOYD','#024731','lloydsbank.com','GB'],
    ['natwest','NatWest','NW','#42145F','natwest.com','GB'],
    ['santuk','Santander UK','SAN','#EC0000','santander.co.uk','GB'],
    ['halifax','Halifax','HAL','#005EB8','halifax.co.uk','GB'],
    ['monzo','Monzo','MON','#FF3464','monzo.com','GB'],
    ['starling','Starling Bank','STAR','#6935D3','starlingbank.com','GB'],
    ['revolut','Revolut','REV','#191C1F','revolut.com','GB'],
  ]),
  DE: makeBanks([
    ['db','Deutsche Bank','DB','#003399','db.com','DE'],
    ['commerz','Commerzbank','CB','#FFCC00','commerzbank.de','DE'],
    ['n26','N26','N26','#48AC98','n26.com','DE'],
    ['dkb','DKB','DKB','#0075C9','dkb.de','DE'],
    ['sparkasse','Sparkasse','SPK','#E60000','sparkasse.de','DE'],
  ]),
  FR: makeBanks([
    ['bnpfr','BNP Paribas','BNP','#00965E','mabanque.bnpparibas','FR'],
    ['socgen','Société Générale','SG','#E60028','particuliers.sg.fr','FR'],
    ['lcl','LCL','LCL','#009FE3','lcl.fr','FR'],
    ['creditag','Crédit Agricole','CA','#008D55','credit-agricole.fr','FR'],
    ['bpce','Banque Populaire','BP','#E4002B','banquepopulaire.fr','FR'],
  ]),
  NL: makeBanks([
    ['ingnl','ING Netherlands','ING','#FF6200','ing.nl','NL'],
    ['abn','ABN AMRO','ABN','#00AEEF','abnamro.nl','NL'],
    ['rabobank','Rabobank','RABO','#FF6600','rabobank.nl','NL'],
  ]),
  IT: makeBanks([
    ['intesa','Intesa Sanpaolo','ISP','#007A53','intesasanpaolo.com','IT'],
    ['unicredit','UniCredit','UCR','#E60000','unicredit.it','IT'],
    ['bpm','Banco BPM','BPM','#0072BC','bancobpm.it','IT'],
  ]),
  ES: makeBanks([
    ['sant_es','Banco Santander','SAN','#EC0000','bancosantander.es','ES'],
    ['bbva','BBVA','BBVA','#004481','bbva.es','ES'],
    ['caixa','CaixaBank','CAIXA','#007EAE','caixabank.es','ES'],
    ['sabadell','Banco Sabadell','SAB','#0075C9','bancsabadell.com','ES'],
  ]),
  IE: makeBanks([
    ['aib','AIB','AIB','#007D5B','aib.ie','IE'],
    ['boi','Bank of Ireland','BOI','#00804B','bankofireland.com','IE'],
    ['ptsb','Permanent TSB','PTSB','#00AEEF','ptsb.ie','IE'],
  ]),
  AE: makeBanks([
    ['enbd','Emirates NBD','ENBD','#C8102E','emiratesnbd.com','AE'],
    ['fab','First Abu Dhabi Bank','FAB','#00855A','bankfab.com','AE'],
    ['adcb','Abu Dhabi Commercial Bank','ADCB','#00529B','adcb.com','AE'],
    ['mashreq','Mashreq Bank','MASH','#E31E25','mashreq.com','AE'],
    ['dib','Dubai Islamic Bank','DIB','#00843D','dib.ae','AE'],
    ['wio','Wio Bank','WIO','#6C2BD9','wio.io','AE'],
  ]),
  SA: makeBanks([
    ['alrajhi','Al Rajhi Bank','ARB','#00704A','alrajhibank.com.sa','SA'],
    ['snb','Saudi National Bank','SNB','#006B54','alahli.com','SA'],
    ['riyad','Riyad Bank','RYD','#005B99','riyadbank.com','SA'],
    ['alinma','Alinma Bank','INMA','#009B77','alinma.com','SA'],
  ]),
  QA: makeBanks([
    ['qnb','Qatar National Bank','QNB','#8B0000','qnb.com','QA'],
    ['cbq','Commercial Bank Qatar','CBQ','#004B87','cbq.qa','QA'],
    ['dohabank','Doha Bank','DOHA','#005CA9','dohabank.com.qa','QA'],
    ['dukhan','Dukhan Bank','DUK','#6C1D45','dukhanbank.com','QA'],
  ]),
  KW: makeBanks([
    ['nbk','National Bank of Kuwait','NBK','#007A53','nbk.com','KW'],
    ['gulfkw','Gulf Bank','GULF','#E31B54','e-gulfbank.com','KW'],
    ['boubyan','Boubyan Bank','BOU','#7B2CBF','boubyan.bank','KW'],
  ]),
  BH: makeBanks([
    ['nbb','National Bank of Bahrain','NBB','#C8102E','nbbonline.com','BH'],
    ['bbk','Bank of Bahrain and Kuwait','BBK','#00529B','bbkonline.com','BH'],
    ['bisb','Bahrain Islamic Bank','BISB','#00843D','bisb.com','BH'],
  ]),
  BJ: makeBanks([
    ['boa_bj','Bank of Africa Benin','BOA','#E31C23','boabenin.com','BJ'],
    ['ecobank_bj','Ecobank Benin','ECO','#0066B3','ecobank.com','BJ'],
    ['orabank_bj','Orabank Benin','ORA','#006A4E','orabank.net','BJ'],
    ['nsia_bj','NSIA Banque Bénin','NSIA','#00843D','nsiabanque.com','BJ'],
  ]),
  BF: makeBanks([
    ['ecobank_bf','Ecobank Burkina Faso','ECO','#0066B3','ecobank.com','BF'],
    ['boa_bf','Bank of Africa Burkina Faso','BOA','#E31C23','boaburkina.com','BF'],
    ['biciab','BICIAB','BICI','#00529B','biciab.com','BF'],
    ['coris','Coris Bank International','CORIS','#E31C23','coris.bank','BF'],
    ['uba_bf','UBA Burkina Faso','UBA','#D32F2F','ubagroup.com','BF'],
  ]),
  CI: makeBanks([
    ['sgci','Société Générale Côte d’Ivoire','SG','#E60028','societegenerale.ci','CI'],
    ['bici_ci','BICICI','BICI','#00529B','bici-ci.com','CI'],
    ['sib_ci','Société Ivoirienne de Banque','SIB','#003B70','sib.ci','CI'],
    ['nsia_ci','NSIA Banque Côte d’Ivoire','NSIA','#00843D','nsiabanque.com','CI'],
    ['boa_ci','Bank of Africa Côte d’Ivoire','BOA','#E31C23','boacotedivoire.com','CI'],
    ['ecobank_ci','Ecobank Côte d’Ivoire','ECO','#0066B3','ecobank.com','CI'],
    ['coris_ci','Coris Bank International CI','CORIS','#E31C23','coris.bank','CI'],
  ]),
  GW: makeBanks([
    ['ecobank_gw','Ecobank Guinea-Bissau','ECO','#0066B3','ecobank.com','GW'],
    ['bao','Banco da Africa Ocidental','BAO','#E31C23','bao.gw','GW'],
    ['bdu','Banco da União','BDU','#006A4E','bdu.gw','GW'],
  ]),
  ML: makeBanks([
    ['bms','Banque Malienne de Solidarité','BMS','#00843D','bms-sa.ml','ML'],
    ['bnda','Banque Nationale de Développement Agricole','BNDA','#006A4E','bnda-mali.com','ML'],
    ['boa_ml','Bank of Africa Mali','BOA','#E31C23','boamali.com','ML'],
    ['ecobank_ml','Ecobank Mali','ECO','#0066B3','ecobank.com','ML'],
    ['bici_ml','BICIM','BICIM','#00529B','bicim.com','ML'],
  ]),
  NE: makeBanks([
    ['bnic','Banque Nigérienne pour l’Industrie et le Commerce','BNIC','#00529B','bnic.ne','NE'],
    ['boa_ne','Bank of Africa Niger','BOA','#E31C23','boaniger.com','NE'],
    ['ecobank_ne','Ecobank Niger','ECO','#0066B3','ecobank.com','NE'],
    ['sonibank','SONIBANK','SONI','#006A4E','sonibank.com','NE'],
  ]),
  SN: makeBanks([
    ['cbao','CBAO Groupe Attijariwafa bank','CBAO','#E31C23','cbao.sn','SN'],
    ['bhs','Banque de l’Habitat du Sénégal','BHS','#006A4E','bhs.sn','SN'],
    ['bicis','BICIS','BICIS','#00529B','bicis.sn','SN'],
    ['boa_sn','Bank of Africa Sénégal','BOA','#E31C23','boasenegal.com','SN'],
    ['ecobank_sn','Ecobank Sénégal','ECO','#0066B3','ecobank.com','SN'],
    ['orabank_sn','Orabank Sénégal','ORA','#006A4E','orabank.net','SN'],
    ['uba_sn','UBA Sénégal','UBA','#D32F2F','ubagroup.com','SN'],
  ]),
  TG: makeBanks([
    ['btci','Banque Togolaise pour le Commerce et l’Industrie','BTCI','#00529B','btci.tg','TG'],
    ['ecobank_tg','Ecobank Togo','ECO','#0066B3','ecobank.com','TG'],
    ['boa_tg','Bank of Africa Togo','BOA','#E31C23','boatogo.com','TG'],
    ['utb','Union Togolaise de Banque','UTB','#006A4E','utb.tg','TG'],
    ['orabank_tg','Orabank Togo','ORA','#006A4E','orabank.net','TG'],
  ]),
  GH: makeBanks([
    ['gcb','GCB Bank','GCB','#006A4E','gcbbank.com.gh','GH'],
    ['ecogh','Ecobank Ghana','ECO','#0066B3','ecobank.com','GH'],
    ['accessgh','Access Bank Ghana','ACC','#F7941D','ghana.accessbankplc.com','GH'],
    ['absa_gh','Absa Bank Ghana','ABSA','#E2001A','absa.com.gh','GH'],
    ['stanbicgh','Stanbic Bank Ghana','STB','#0033A0','stanbic.com.gh','GH'],
    ['fidelitygh','Fidelity Bank Ghana','FID','#7B2D8E','myfidelitybank.net','GH'],
    ['cal','CalBank','CAL','#E31C23','calbank.net','GH'],
    ['adbgh','Agricultural Development Bank','ADB','#00843D','agricbank.com','GH'],
    ['boagh','Bank of Africa Ghana','BOA','#E31C23','boaghana.com','GH'],
    ['cbg','Consolidated Bank Ghana','CBG','#00529B','cbg.com.gh','GH'],
    ['fabgh','First Atlantic Bank','FAB','#003B70','firstatlanticbank.com.gh','GH'],
    ['fbngh','FBNBank Ghana','FBN','#003B70','fbnbankghana.com','GH'],
    ['fnbgh','First National Bank Ghana','FNB','#00A4E4','firstnationalbank.com.gh','GH'],
    ['gtbgh','Guaranty Trust Bank Ghana','GTB','#E35205','gtbghana.com','GH'],
    ['nibgh','National Investment Bank','NIB','#0066B3','nib-ghana.com','GH'],
    ['omnibsic','OmniBSIC Bank','OMNI','#006A4E','omnibsic.com.gh','GH'],
    ['prudentialgh','Prudential Bank','PRU','#00529B','prudentialbank.com.gh','GH'],
    ['republicgh','Republic Bank Ghana','REP','#E31C23','republicghana.com','GH'],
    ['socgen_gh','Société Générale Ghana','SG','#E60028','societegenerale.com.gh','GH'],
    ['scb_gh','Standard Chartered Ghana','SCB','#0072AA','sc.com/gh','GH'],
    ['ubagh','UBA Ghana','UBA','#D32F2F','ubagroup.com','GH'],
    ['umbgh','Universal Merchant Bank','UMB','#E31C23','myumbbank.com','GH'],
    ['zenithgh','Zenith Bank Ghana','ZEN','#ED1C24','zenithbank.com.gh','GH'],
    ['mtnmomo','MTN MoMo','MOMO','#FFC72C','mtn.com.gh','GH','mobile-money'],
    ['airteltigo','AirtelTigo Money','AT','#E31C23','at.com.gh','GH','mobile-money'],
    ['telecelcash','Telecel Cash','TC','#E60000','telecel.com.gh','GH','mobile-money'],
    ['g_money','G-Money','GM','#006A4E','gcb.com.gh','GH','mobile-money'],
    ['palmpaygh','PalmPay Ghana','PP','#7B2CBF','palmpay.co','GH','digital'],
  ]),
  KE: makeBanks([
    ['kcb','KCB Bank Kenya','KCB','#00529B','kcbgroup.com','KE'],
    ['equity','Equity Bank','EQT','#E60028','equitygroupholdings.com','KE'],
    ['coopke','Co-operative Bank','COOP','#005A8E','co-opbank.co.ke','KE'],
    ['absa_ke','Absa Bank Kenya','ABSA','#E2001A','absa.co.ke','KE'],
    ['stanbicke','Stanbic Bank Kenya','STB','#0033A0','stanbicbank.co.ke','KE'],
    ['ncba','NCBA Bank','NCBA','#00AEEF','ncbagroup.com','KE'],
    ['mpesa','M-Pesa','MPESA','#4CAF50','safaricom.co.ke','KE'],
  ]),
  ZA: makeBanks([
    ['fnb','First National Bank','FNB','#00A4E4','fnb.co.za','ZA'],
    ['standardza','Standard Bank','STD','#009FD4','standardbank.co.za','ZA'],
    ['absa','Absa Bank','ABSA','#E2001A','absa.co.za','ZA'],
    ['nedbank','Nedbank','NED','#009639','nedbank.co.za','ZA'],
    ['capitec','Capitec Bank','CAP','#005CA9','capitecbank.co.za','ZA'],
    ['investec','Investec Bank','INV','#000000','investec.com','ZA'],
  ]),
  EG: makeBanks([
    ['nbe','National Bank of Egypt','NBE','#006B4F','nbe.com.eg','EG'],
    ['banquemisr','Banque Misr','BM','#D71920','banquemisr.com','EG'],
    ['cibeg','Commercial International Bank','CIB','#8A1538','cibeg.com','EG'],
    ['qnb_eg','QNB Alahli','QNB','#8B0000','qnbalahli.com','EG'],
    ['alexbank','AlexBank','ALEX','#0072BC','alexbank.com','EG'],
  ]),
  ET: makeBanks([
    ['cbe','Commercial Bank of Ethiopia','CBE','#00A651','combanketh.et','ET'],
    ['awash','Awash Bank','AWASH','#0066B3','awashbank.com','ET'],
    ['dashen','Dashen Bank','DASH','#E31C23','dashenbanksc.com','ET'],
    ['abyssinia','Bank of Abyssinia','BOA','#007A53','bankofabyssinia.com','ET'],
  ]),
  UG: makeBanks([
    ['stanbicug','Stanbic Bank Uganda','STB','#0033A0','stanbicbank.co.ug','UG'],
    ['centenary','Centenary Bank','CENT','#006B4F','centenarybank.co.ug','UG'],
    ['dfcu','dfcu Bank','DFCU','#00AEEF','dfcugroup.com','UG'],
    ['absa_ug','Absa Bank Uganda','ABSA','#E2001A','absa.co.ug','UG'],
  ]),
  TZ: makeBanks([
    ['crdb','CRDB Bank','CRDB','#006B4F','crdbbank.co.tz','TZ'],
    ['nmbtz','NMB Bank','NMB','#00AEEF','nmbbank.co.tz','TZ'],
    ['absa_tz','Absa Bank Tanzania','ABSA','#E2001A','absa.co.tz','TZ'],
    ['stanbictz','Stanbic Bank Tanzania','STB','#0033A0','stanbicbank.co.tz','TZ'],
  ]),
  RW: makeBanks([
    ['bk','Bank of Kigali','BK','#006B4F','bk.rw','RW'],
    ['equityrw','Equity Bank Rwanda','EQT','#E60028','equitybank.co.rw','RW'],
    ['bpr','BPR Bank Rwanda','BPR','#00529B','bpr.rw','RW'],
  ]),
  CA: makeBanks([
    ['rbc','Royal Bank of Canada','RBC','#005DAA','rbc.com','CA'],
    ['tdca','TD Canada Trust','TD','#54B848','td.com','CA'],
    ['bmo','Bank of Montreal','BMO','#0079C1','bmo.com','CA'],
    ['scotia','Scotiabank','SCOT','#EC111A','scotiabank.com','CA'],
    ['cibc','CIBC','CIBC','#C41F3E','cibc.com','CA'],
    ['nationalca','National Bank of Canada','NBC','#E31B54','bnc.ca','CA'],
    ['laurentian','Laurentian Bank','LB','#0072BC','laurentianbank.ca','CA'],
    ['desjardins','Desjardins','DESJ','#00843D','desjardins.com','CA'],
    ['atb','ATB Financial','ATB','#0072BC','atb.com','CA'],
    ['eqbank','EQ Bank','EQ','#00AEEF','eqbank.ca','CA','digital'],
    ['tangerine','Tangerine Bank','TAN','#F58220','tangerine.ca','CA','digital'],
    ['simplii','Simplii Financial','SIM','#C8102E','simplii.com','CA','digital'],
    ['coastcapital','Coast Capital Savings','CCS','#006A4E','coastcapitalsavings.com','CA','credit-union'],
    ['vancity','Vancity','VAN','#00529B','vancity.com','CA','credit-union'],
  ]),
  BR: makeBanks([
    ['itau','Itaú Unibanco','ITAU','#EC7000','itau.com.br','BR'],
    ['bradesco','Bradesco','BRA','#CC092F','banco.bradesco','BR'],
    ['santbr','Santander Brasil','SAN','#EC0000','santander.com.br','BR'],
    ['bbbr','Banco do Brasil','BB','#F8D117','bb.com.br','BR'],
    ['caixa_br','Caixa Econômica Federal','CEF','#0066B3','caixa.gov.br','BR'],
    ['nubank','Nubank','NU','#820AD1','nubank.com.br','BR'],
  ]),
  MX: makeBanks([
    ['bbva_mx','BBVA México','BBVA','#004481','bbva.mx','MX'],
    ['santmx','Santander México','SAN','#EC0000','santander.com.mx','MX'],
    ['banorte','Banorte','BAN','#EB0029','banorte.com','MX'],
    ['hsbcmx','HSBC México','HSBC','#DB0011','hsbc.com.mx','MX'],
    ['citibanamex','Citibanamex','CITI','#003B70','citibanamex.com','MX'],
  ]),
  CH: makeBanks([
    ['ubs','UBS','UBS','#E60000','ubs.com','CH'],
    ['postfinance','PostFinance','POST','#FFD500','postfinance.ch','CH'],
    ['raiffeisen_ch','Raiffeisen Switzerland','RAI','#F5A623','raiffeisen.ch','CH'],
    ['zuercher','Zürcher Kantonalbank','ZKB','#0072BC','zkb.ch','CH'],
  ]),
  SE: makeBanks([
    ['seb','SEB','SEB','#006B4F','seb.se','SE'],
    ['swedbank','Swedbank','SWED','#F5A623','swedbank.se','SE'],
    ['handelsbanken','Handelsbanken','SHB','#00529B','handelsbanken.se','SE'],
    ['nordea_se','Nordea','NOR','#00005E','nordea.se','SE'],
  ]),
  NO: makeBanks([
    ['dnb','DNB','DNB','#007A53','dnb.no','NO'],
    ['nordea_no','Nordea Norway','NOR','#00005E','nordea.no','NO'],
    ['sparebank1','SpareBank 1','SB1','#0072BC','sparebank1.no','NO'],
  ]),
  PL: makeBanks([
    ['pkobp','PKO Bank Polski','PKO','#0066B3','pkobp.pl','PL'],
    ['mbank','mBank','MB','#E31B54','mbank.pl','PL'],
    ['santpl','Santander Bank Polska','SAN','#EC0000','santander.pl','PL'],
    ['pekao','Bank Pekao','PEK','#D71920','pekao.com.pl','PL'],
  ]),
  CN: makeBanks([
    ['icbc','Industrial and Commercial Bank of China','ICBC','#C8102E','icbc.com.cn','CN'],
    ['boc','Bank of China','BOC','#C8102E','boc.cn','CN'],
    ['ccb','China Construction Bank','CCB','#003399','ccb.com','CN'],
    ['abc','Agricultural Bank of China','ABC','#00965E','abchina.com','CN'],
    ['cmb','China Merchants Bank','CMB','#C8102E','cmbchina.com','CN'],
  ]),
  JP: makeBanks([
    ['mufg','MUFG Bank','MUFG','#C8102E','bk.mufg.jp','JP'],
    ['smbc','Sumitomo Mitsui Banking Corporation','SMBC','#005BAC','smbc.co.jp','JP'],
    ['mizuho','Mizuho Bank','MIZ','#004EA2','mizuhobank.co.jp','JP'],
    ['jppost','Japan Post Bank','JPB','#CC0000','jp-bank.japanpost.jp','JP'],
    ['rakuten','Rakuten Bank','RAK','#BF0000','rakuten-bank.co.jp','JP'],
  ]),
  IN: makeBanks([
    ['sbi','State Bank of India','SBI','#22409A','sbi.co.in','IN'],
    ['hdfc','HDFC Bank','HDFC','#004C8F','hdfcbank.com','IN'],
    ['icici','ICICI Bank','ICICI','#F77F00','icicibank.com','IN'],
    ['axis','Axis Bank','AXIS','#8A1538','axisbank.com','IN'],
    ['kotak','Kotak Mahindra Bank','KOTAK','#ED1C24','kotak.com','IN'],
    ['pnb','Punjab National Bank','PNB','#E31B54','pnbindia.in','IN'],
  ]),
  KR: makeBanks([
    ['kb','KB Kookmin Bank','KB','#6B2D8B','kbstar.com','KR'],
    ['shinhan','Shinhan Bank','SHIN','#005BAC','shinhan.com','KR'],
    ['hana','Hana Bank','HANA','#009B77','kebhana.com','KR'],
    ['woori','Woori Bank','WOORI','#0072BC','wooribank.com','KR'],
    ['nh','NongHyup Bank','NH','#00843D','nonghyup.com','KR'],
  ]),
  SG: makeBanks([
    ['dbs','DBS Bank','DBS','#E5202E','dbs.com.sg','SG'],
    ['ocbc','OCBC Bank','OCBC','#C41E3A','ocbc.com','SG'],
    ['uob','United Overseas Bank','UOB','#00529B','uob.com.sg','SG'],
    ['maybanksg','Maybank Singapore','MAY','#F5C400','maybank2u.com.sg','SG'],
  ]),
  HK: makeBanks([
    ['hsbchk','HSBC Hong Kong','HSBC','#DB0011','hsbc.com.hk','HK'],
    ['boc_hk','Bank of China (Hong Kong)','BOCHK','#C8102E','bochk.com','HK'],
    ['hangseng','Hang Seng Bank','HSB','#00843D','hangseng.com','HK'],
    ['sc_hk','Standard Chartered Hong Kong','SCB','#0072AA','sc.com/hk','HK'],
    ['bea','Bank of East Asia','BEA','#B5121B','hkbea.com','HK'],
  ]),
  MY: makeBanks([
    ['maybank','Maybank','MAY','#F5C400','maybank.com','MY'],
    ['cimb','CIMB Bank','CIMB','#D71920','cimb.com.my','MY'],
    ['publicmy','Public Bank','PB','#E31B54','pbebank.com','MY'],
    ['rhb','RHB Bank','RHB','#00529B','rhbgroup.com','MY'],
    ['hongleong','Hong Leong Bank','HLB','#D71920','hlb.com.my','MY'],
  ]),
  ID: makeBanks([
    ['bca','Bank Central Asia (BCA)','BCA','#0066B3','bca.co.id','ID'],
    ['mandiri','Bank Mandiri','MANDIRI','#003399','bankmandiri.co.id','ID'],
    ['bri','Bank Rakyat Indonesia','BRI','#00529B','bri.co.id','ID'],
    ['bni','Bank Negara Indonesia','BNI','#F58220','bni.co.id','ID'],
    ['permata','PermataBank','PERMATA','#00843D','permatabank.com','ID'],
  ]),
  PH: makeBanks([
    ['bdo','BDO Unibank','BDO','#0072BC','bdo.com.ph','PH'],
    ['bpi','Bank of the Philippine Islands','BPI','#8A1538','bpi.com.ph','PH'],
    ['metrobank','Metrobank','METRO','#003399','metrobank.com.ph','PH'],
    ['landbank','Land Bank of the Philippines','LANDBANK','#00843D','landbank.com','PH'],
    ['unionph','UnionBank of the Philippines','UBP','#E31B54','unionbankph.com','PH'],
  ]),
  TH: makeBanks([
    ['bbl','Bangkok Bank','BBL','#0072BC','bangkokbank.com','TH'],
    ['kbank','Kasikornbank','KBANK','#00843D','kasikornbank.com','TH'],
    ['scbth','Siam Commercial Bank','SCB','#6B2D8B','scb.co.th','TH'],
    ['krungthai','Krungthai Bank','KTB','#009B77','krungthai.com','TH'],
    ['krungsri','Bank of Ayudhya','BAY','#F5C400','krungsri.com','TH'],
  ]),
  AU: makeBanks([
    ['anz','ANZ','ANZ','#007DC6','anz.com.au','AU'],
    ['cba','Commonwealth Bank','CBA','#FFCC00','commbank.com.au','AU'],
    ['nab','National Australia Bank','NAB','#E31837','nab.com.au','AU'],
    ['westpac','Westpac','WBC','#DA1710','westpac.com.au','AU'],
    ['macquarie','Macquarie Bank','MAC','#000000','macquarie.com.au','AU'],
  ]),
  NZ: makeBanks([
    ['anznz','ANZ New Zealand','ANZ','#007DC6','anz.co.nz','NZ'],
    ['bnznz','Bank of New Zealand','BNZ','#D71920','bnz.co.nz','NZ'],
    ['asb','ASB Bank','ASB','#F5C400','asb.co.nz','NZ'],
    ['westpacnz','Westpac New Zealand','WBC','#DA1710','westpac.co.nz','NZ'],
    ['kiwi','Kiwibank','KIWI','#00843D','kiwibank.co.nz','NZ'],
    ['tsb_nz','TSB Bank New Zealand','TSB','#003B70','tsb.co.nz','NZ'],
    ['heartland','Heartland Bank','HB','#00AEEF','heartland.co.nz','NZ'],
    ['rabobank_nz','Rabobank New Zealand','RABO','#FF6600','rabobank.co.nz','NZ'],
  ]),
};

export const CURRENCY_COUNTRIES: Record<string, string[]> = {
  NGN:['NG'], USD:['US'], GBP:['GB'], EUR:['DE','FR','NL','IT','ES','IE'],
  AED:['AE'], SAR:['SA'], QAR:['QA'], KWD:['KW'], BHD:['BH'],
  GHS:['GH'], KES:['KE'], ZAR:['ZA'], EGP:['EG'], ETB:['ET'],
  UGX:['UG'], TZS:['TZ'], RWF:['RW'],
  XOF:['BJ','BF','CI','GW','ML','NE','SN','TG'],
  CAD:['CA'], BRL:['BR'], MXN:['MX'], CHF:['CH'], SEK:['SE'],
  NOK:['NO'], PLN:['PL'], CNY:['CN'], JPY:['JP'], INR:['IN'],
  KRW:['KR'], SGD:['SG'], HKD:['HK'], MYR:['MY'], IDR:['ID'],
  PHP:['PH'], THB:['TH'], AUD:['AU'], NZD:['NZ'],
};

export function getBanksForCurrency(currencyCode: string): Bank[] {
  if (!currencyCode || currencyCode === 'NGN') return NG_BANKS;
  const countries = CURRENCY_COUNTRIES[currencyCode] ?? [];
  return countries.flatMap(country => INTL_BANKS[country] ?? []);
}

export const CURRENCY_FLAG: Record<string, string> = {
  NGN:'🇳🇬', USD:'🇺🇸', GBP:'🇬🇧', EUR:'🇪🇺', AED:'🇦🇪',
  SAR:'🇸🇦', GHS:'🇬🇭', KES:'🇰🇪', ZAR:'🇿🇦', CAD:'🇨🇦',
  INR:'🇮🇳', CNY:'🇨🇳', AUD:'🇦🇺', NZD:'🇳🇿', SGD:'🇸🇬',
  HKD:'🇭🇰', KRW:'🇰🇷', MYR:'🇲🇾', IDR:'🇮🇩', PHP:'🇵🇭',
  THB:'🇹🇭', BRL:'🇧🇷', MXN:'🇲🇽', CHF:'🇨🇭', SEK:'🇸🇪',
  NOK:'🇳🇴', PLN:'🇵🇱', EGP:'🇪🇬', ETB:'🇪🇹', UGX:'🇺🇬',
  TZS:'🇹🇿', RWF:'🇷🇼', XOF:'🌍', QAR:'🇶🇦', KWD:'🇰🇼', BHD:'🇧🇭',
};

/** Demo-only name enquiry. Replace with a licensed account-verification provider. */
export async function resolveAccountName(accountNumber: string, _bankCode: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 600));
  if (!/^\d{10}$/.test(accountNumber)) throw new Error('Account number must be 10 digits');
  const names = ['Chinedu Okafor','Adaobi Nwosu','Ibrahim Musa','Funke Adeyemi','Tunde Bakare','Ngozi Eze','Yusuf Bello','Blessing Okoro'];
  return names[parseInt(accountNumber.slice(-2), 10) % names.length];
}
