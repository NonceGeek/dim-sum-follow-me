// Generated for 广图粤语公开课测评集 / 测评集2.0.
// Local clips: public/audio/poems/*.mp3
// OSS poems: https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/poem/<slug>.mp3

const OSS_POEM_AUDIO_BASE =
  "https://dimsum-audio.oss-cn-guangzhou.aliyuncs.com/poem";

/** Slugs with files in public/audio/poems/ — prefer local over OSS. */
const LOCAL_POEM_AUDIO_SLUGS = new Set(["shi-li-zhi-1", "shi-li-zhi-2"]);

function poemAudioUrl(slug: string): string {
  if (LOCAL_POEM_AUDIO_SLUGS.has(slug)) {
    return `/audio/poems/${slug}.mp3`;
  }
  return `${OSS_POEM_AUDIO_BASE}/${slug}.mp3`;
}

const categoryShilizi = [
  {
    key: "shi-li-zhi-1",
    name: "食荔枝 · 其一 | 蘇軾",
    questions: [
      {
        content:
          "羅(lo4)浮(fau4)山(saan1)下(haa6)四(sei3)時(si4)春(ceon1)，盧(lou4)橘(gwat1)楊(joeng4)梅(mui4)次(ci3)第(dai6)新(san1)。",
        originalText: "罗浮山下四时春，卢橘杨梅次第新。",
        yueText: "羅浮山下四時春，盧橘楊梅次第新。",
        audioUrl: poemAudioUrl("shi-li-zhi-1"),
      },
    ],
  },
  {
    key: "shi-li-zhi-2",
    name: "食荔枝 · 其二 | 蘇軾",
    questions: [
      {
        content:
          "日(jat6)啖(daam6)荔(lai6)枝(zi1)三(saam1)百(baak3)顆(fo2)，不(bat1)辭(ci4)長(coeng4)作(zok3)嶺(ling5)南(naam4)人(jan4)。",
        originalText: "日啖荔枝三百颗，不辞长作岭南人。",
        yueText: "日啖荔枝三百顆，不辭長作嶺南人。",
        audioUrl: poemAudioUrl("shi-li-zhi-2"),
      },
    ],
  },
];

// 广图粤语公开课测评集2.0 — 经典 20 首古诗词粤语诵读
const categoryShiliziV2 = [
  {
    key: "bo-qin-huai",
    name: "泊秦淮 | 杜牧",
    questions: [
      {
        content:
          "煙(jin1)籠(lung4)寒(hon4)水(seoi2)月(jyut6)籠(lung4)沙(saa1)，夜(je6)泊(paak3)秦(ceon4)淮(waai4)近(gan6)酒(zau2)家(gaa1)。商(soeng1)女(neoi5)不(bat1)知(zi1)亡(mong4)國(gwok3)恨(han6)，隔(gaak3)江(gong1)猶(jau4)唱(coeng3)後(hau6)庭(ting4)花(faa1)。",
        originalText: "烟笼寒水月笼沙，夜泊秦淮近酒家。商女不知亡国恨，隔江犹唱后庭花。",
        yueText: "煙籠寒水月籠沙，夜泊秦淮近酒家。商女不知亡國恨，隔江猶唱後庭花。",
        audioUrl: poemAudioUrl("bo-qin-huai"),
      },
    ],
  },
  {
    key: "chou-le-tian-yang-zhou-chu-feng-xi-shang-jian-zeng",
    name: "酬樂天揚州初逢席上見贈 | 劉禹錫",
    questions: [
      {
        content:
          "巴(baa1)山(saan1)楚(co2)水(seoi2)淒(cai1)涼(loeng4)地(dei6)，二(ji6)十(sap6)三(saam1)年(nin4)棄(hei3)置(zi3)身(san1)。懷(waai4)舊(gau6)空(hung1)吟(jam4)聞(man4)笛(dek6)賦(fu3)，到(dou3)鄉(hoeng1)翻(faan1)似(ci5)爛(laan6)柯(o1)人(jan4)。沉(cam4)舟(zau1)側(zak1)畔(bun6)千(cin1)帆(faan4)過(gwo3)，病(beng6)樹(syu6)前(cin4)頭(tau4)萬(maan6)木(muk6)春(ceon1)。今(gam1)日(jat6)聽(teng1)君(gwan1)歌(go1)一(jat1)曲(kuk1)，暫(zaam6)憑(pang4)杯(bui1)酒(zau2)長(coeng4)精(zing1)神(san4)。",
        originalText: "巴山楚水凄凉地，二十三年弃置身。怀旧空吟闻笛赋，到乡翻似烂柯人。沉舟侧畔千帆过，病树前头万木春。今日听君歌一曲，暂凭杯酒长精神。",
        yueText: "巴山楚水淒涼地，二十三年棄置身。懷舊空吟聞笛賦，到鄉翻似爛柯人。沉舟側畔千帆過，病樹前頭萬木春。今日聽君歌一曲，暫憑杯酒長精神。",
        audioUrl: poemAudioUrl("chou-le-tian-yang-zhou-chu-feng-xi-shang-jian-zeng"),
      },
    ],
  },
  {
    key: "chun-xiao",
    name: "春曉 | 孟浩然",
    questions: [
      {
        content:
          "春(ceon1)眠(min4)不(bat1)覺(gok3)曉(hiu2)，處(cyu5)處(cyu5)聞(man4)啼(tai4)鳥(niu5)。夜(je6)來(loi4)風(fung1)雨(jyu5)聲(sing1)，花(faa1)落(lok6)知(zi1)多(do1)少(siu2)。",
        originalText: "春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。",
        yueText: "春眠不覺曉，處處聞啼鳥。夜來風雨聲，花落知多少。",
        audioUrl: poemAudioUrl("chun-xiao"),
      },
    ],
  },
  {
    key: "cun-ju",
    name: "村居 | 高鼎",
    questions: [
      {
        content:
          "草(cou2)長(coeng4)鶯(ang1)飛(fei1)二(ji6)月(jyut6)天(tin1)，拂(fat1)堤(tai4)楊(joeng4)柳(lau5)醉(zeoi3)春(ceon1)煙(jin1)。兒(ji4)童(tung4)散(saan3)學(hok6)歸(gwai1)來(loi4)早(zou2)，忙(mong4)趁(can3)東(dung1)風(fung1)放(fong3)紙(zi2)鳶(jyun1)。",
        originalText: "草长莺飞二月天，拂堤杨柳醉春烟。儿童散学归来早，忙趁东风放纸鸢。",
        yueText: "草長鶯飛二月天，拂堤楊柳醉春煙。兒童散學歸來早，忙趁東風放紙鳶。",
        audioUrl: poemAudioUrl("cun-ju"),
      },
    ],
  },
  {
    key: "deng-guan-que-lou",
    name: "登鸛雀樓 | 王之渙",
    questions: [
      {
        content:
          "白(baak6)日(jat6)依(ji1)山(saan1)盡(zeon6)，黃(wong4)河(ho4)入(jap6)海(hoi2)流(lau4)。欲(juk6)窮(kung4)千(cin1)里(lei5)目(muk6)，更(gang3)上(soeng5)一(jat1)層(cang4)樓(lau4)。",
        originalText: "白日依山尽，黄河入海流。欲穷千里目，更上一层楼。",
        yueText: "白日依山盡，黃河入海流。欲窮千里目，更上一層樓。",
        audioUrl: poemAudioUrl("deng-guan-que-lou"),
      },
    ],
  },
  {
    key: "fu-de-gu-yuan-cao-song-bie",
    name: "賦得古原草送別 | 白居易",
    questions: [
      {
        content:
          "離(lei4)離(lei4)原(jyun4)上(soeng6)草(cou2)，一(jat1)歲(seoi3)一(jat1)枯(fu1)榮(wing4)。野(je5)火(fo2)燒(siu1)不(bat1)盡(zeon6)，春(ceon1)風(fung1)吹(ceoi1)又(jau6)生(saang1)。",
        originalText: "离离原上草，一岁一枯荣。野火烧不尽，春风吹又生。",
        yueText: "離離原上草，一歲一枯榮。野火燒不盡，春風吹又生。",
        audioUrl: poemAudioUrl("fu-de-gu-yuan-cao-song-bie"),
      },
    ],
  },
  {
    key: "hui-zhou-yi-jue-shi-li-zhi",
    name: "惠州一絕·食荔枝 | 蘇軾",
    questions: [
      {
        content:
          "羅(lo4)浮(fau4)山(saan1)下(haa6)四(sei3)時(si4)春(ceon1)，盧(lou4)橘(gwat1)楊(joeng4)梅(mui4)次(ci3)第(dai6)新(san1)。日(jat6)啖(daam6)荔(lai6)枝(zi1)三(saam1)百(baak3)顆(fo2)，不(bat1)辭(ci4)長(coeng4)作(zok3)嶺(ling5)南(naam4)人(jan4)。",
        originalText: "罗浮山下四时春，卢橘杨梅次第新。日啖荔枝三百颗，不辞长作岭南人。",
        yueText: "羅浮山下四時春，盧橘楊梅次第新。日啖荔枝三百顆，不辭長作嶺南人。",
        audioUrl: poemAudioUrl("hui-zhou-yi-jue-shi-li-zhi"),
      },
    ],
  },
  {
    key: "jiang-xue",
    name: "江雪 | 柳宗元",
    questions: [
      {
        content:
          "千(cin1)山(saan1)鳥(niu5)飛(fei1)絕(zyut6)，萬(maan6)徑(ging3)人(jan4)蹤(zung1)滅(mit6)。孤(gu1)舟(zau1)蓑(so1)笠(lap1)翁(jung1)，獨(duk6)釣(diu3)寒(hon4)江(gong1)雪(syut3)。",
        originalText: "千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。",
        yueText: "千山鳥飛絕，萬徑人蹤滅。孤舟蓑笠翁，獨釣寒江雪。",
        audioUrl: poemAudioUrl("jiang-xue"),
      },
    ],
  },
  {
    key: "jing-ye-si",
    name: "靜夜思 | 李白",
    questions: [
      {
        content:
          "床(cong4)前(cin4)明(ming4)月(jyut6)光(gwong1)，疑(ji4)是(si6)地(dei6)上(soeng6)霜(soeng1)。舉(geoi2)頭(tau4)望(mong6)明(ming4)月(jyut6)，低(dai1)頭(tau4)思(si1)故(gu3)鄉(hoeng1)。",
        originalText: "床前明月光，疑是地上霜。举头望明月，低头思故乡。",
        yueText: "床前明月光，疑是地上霜。舉頭望明月，低頭思故鄉。",
        audioUrl: poemAudioUrl("jing-ye-si"),
      },
    ],
  },
  {
    key: "jiu-yue-jiu-ri-yi-shan-dong-xiong-di",
    name: "九月九日憶山東兄弟 | 王維",
    questions: [
      {
        content:
          "獨(duk6)在(zoi6)異(ji6)鄉(hoeng1)為(wai6)異(ji6)客(haak3)，每(mui5)逢(fung4)佳(gaai1)節(zit3)倍(pui5)思(si1)親(can1)。遙(jiu4)知(zi1)兄(hing1)弟(dai6)登(dang1)高(gou1)處(cyu5)，遍(pin3)插(caap3)茱(zyu1)萸(jyu4)少(siu2)一(jat1)人(jan4)。",
        originalText: "独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。",
        yueText: "獨在異鄉為異客，每逢佳節倍思親。遙知兄弟登高處，遍插茱萸少一人。",
        audioUrl: poemAudioUrl("jiu-yue-jiu-ri-yi-shan-dong-xiong-di"),
      },
    ],
  },
  {
    key: "jue-ju",
    name: "絕句 | 杜甫",
    questions: [
      {
        content:
          "兩(loeng5)個(go3)黃(wong4)鸝(lei4)鳴(ming4)翠(ceoi3)柳(lau5)，一(jat1)行(hong4)白(baak6)鷺(lou6)上(soeng6)青(cing1)天(tin1)。窗(coeng1)含(ham4)西(sai1)嶺(leng5)千(cin1)秋(cau1)雪(syut3)，門(mun4)泊(paak3)東(dung1)吳(ng4)萬(maan6)里(lei5)船(syun4)。",
        originalText: "两个黄鹂鸣翠柳，一行白鹭上青天。窗含西岭千秋雪，门泊东吴万里船。",
        yueText: "兩個黃鸝鳴翠柳，一行白鷺上青天。窗含西嶺千秋雪，門泊東吳萬里船。",
        audioUrl: poemAudioUrl("jue-ju"),
      },
    ],
  },
  {
    key: "po-zhen-zi-wei-chen-tong-fu-fu-zhuang-ci-yi-ji-zhi",
    name: "破陣子·為陳同甫賦壯詞以寄之 | 辛棄疾",
    questions: [
      {
        content:
          "醉(zeoi3)裡(leoi5)挑(tiu1)燈(dang1)看(hon3)劍(gim3)，夢(mung6)回(wui4)吹(ceoi1)角(gok3)連(lin4)營(jing4)。八(baat3)百(baak3)里(lei5)分(fan1)麾(fai1)下(haa6)炙(zek3)，五(ng5)十(sap6)弦(jin4)翻(faan1)塞(coi3)外(ngoi6)聲(sing1)，沙(saa1)場(coeng4)秋(cau1)點(dim2)兵(bing1)。馬(maa5)作(zok3)的(dik1)盧(lou4)飛(fei1)快(faai3)，弓(gung1)如(jyu4)霹(pik1)靂(lik1)弦(jin4)驚(geng1)。了(liu5)卻(koek3)君(gwan1)王(wong4)天(tin1)下(haa6)事(si6)，贏(jeng4)得(dak1)生(sang1)前(cin4)身(san1)後(hau6)名(meng2)。可(ho2)憐(lin4)白(baak6)髮(faat3)生(saang1)！",
        originalText: "醉里挑灯看剑，梦回吹角连营。八百里分麾下炙，五十弦翻塞外声，沙场秋点兵。马作的卢飞快，弓如霹雳弦惊。了却君王天下事，赢得生前身后名。可怜白发生！",
        yueText: "醉裡挑燈看劍，夢回吹角連營。八百里分麾下炙，五十弦翻塞外聲，沙場秋點兵。馬作的盧飛快，弓如霹靂弦驚。了卻君王天下事，贏得生前身後名。可憐白髮生！",
        audioUrl: poemAudioUrl("po-zhen-zi-wei-chen-tong-fu-fu-zhuang-ci-yi-ji-zhi"),
      },
    ],
  },
  {
    key: "qing-ming",
    name: "清明 | 杜牧",
    questions: [
      {
        content:
          "清(cing1)明(ming4)時(si4)節(zit3)雨(jyu5)紛(fan1)紛(fan1)，路(lou6)上(soeng6)行(hang4)人(jan4)欲(juk6)斷(tyun5)魂(wan4)。借(ze3)問(man6)酒(zau2)家(gaa1)何(ho4)處(cyu3)有(jau5)，牧(muk6)童(tung4)遙(jiu4)指(zi2)杏(hang6)花(faa1)村(cyun1)。",
        originalText: "清明时节雨纷纷，路上行人欲断魂。借问酒家何处有，牧童遥指杏花村。",
        yueText: "清明時節雨紛紛，路上行人欲斷魂。借問酒家何處有，牧童遙指杏花村。",
        audioUrl: poemAudioUrl("qing-ming"),
      },
    ],
  },
  {
    key: "wang-lu-shan-pu-bu",
    name: "望廬山瀑布 | 李白",
    questions: [
      {
        content:
          "日(jat6)照(ziu3)香(hoeng1)爐(lou4)生(saang1)紫(zi2)煙(jin1)，遙(jiu4)看(hon3)瀑(buk6)布(bou3)掛(gwaa3)前(cin4)川(cyun1)。飛(fei1)流(lau4)直(zik6)下(haa6)三(saam1)千(cin1)尺(cek3)，疑(ji4)是(si6)銀(ngan4)河(ho4)落(lok6)九(gau2)天(tin1)。",
        originalText: "日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。",
        yueText: "日照香爐生紫煙，遙看瀑布掛前川。飛流直下三千尺，疑是銀河落九天。",
        audioUrl: poemAudioUrl("wang-lu-shan-pu-bu"),
      },
    ],
  },
  {
    key: "wang-tian-men-shan",
    name: "望天門山 | 李白",
    questions: [
      {
        content:
          "天(tin1)門(mun4)中(zung1)斷(dyun6)楚(co2)江(gong1)開(hoi1)，碧(bik1)水(seoi2)東(dung1)流(lau4)至(zi3)此(ci2)回(wui4)。兩(loeng5)岸(ngon6)青(cing1)山(saan1)相(soeng1)對(deoi3)出(ceot1)，孤(gu1)帆(faan4)一(jat1)片(pin3)日(jat6)邊(bin1)來(loi4)。",
        originalText: "天门中断楚江开，碧水东流至此回。两岸青山相对出，孤帆一片日边来。",
        yueText: "天門中斷楚江開，碧水東流至此回。兩岸青山相對出，孤帆一片日邊來。",
        audioUrl: poemAudioUrl("wang-tian-men-shan"),
      },
    ],
  },
  {
    key: "wu-ti-xiang-jian-shi-nan-bie-yi-nan",
    name: "無題·相見時難別亦難 | 李商隱",
    questions: [
      {
        content:
          "相(soeng1)見(gin3)時(si4)難(naan4)別(bit6)亦(jik6)難(naan4)，東(dung1)風(fung1)無(mou4)力(lik6)百(baak3)花(faa1)殘(caan4)。春(ceon1)蠶(caam4)到(dou3)死(sei2)絲(si1)方(fong1)盡(zeon6)，蠟(laap6)炬(geoi6)成(sing4)灰(fui1)淚(leoi6)始(ci2)乾(gon1)。曉(hiu2)鏡(geng3)但(daan6)愁(sau4)雲(wan4)鬢(ban3)改(goi2)，夜(je6)吟(jam4)應(jing1)覺(gok3)月(jyut6)光(gwong1)寒(hon4)。蓬(pung4)山(saan1)此(ci2)去(heoi3)無(mou4)多(do1)路(lou6)，青(cing1)鳥(niu5)殷(jan1)勤(kan4)為(wai6)探(taam3)看(hon3)。",
        originalText: "相见时难别亦难，东风无力百花残。春蚕到死丝方尽，蜡炬成灰泪始干。晓镜但愁云鬓改，夜吟应觉月光寒。蓬山此去无多路，青鸟殷勤为探看。",
        yueText: "相見時難別亦難，東風無力百花殘。春蠶到死絲方盡，蠟炬成灰淚始乾。曉鏡但愁雲鬢改，夜吟應覺月光寒。蓬山此去無多路，青鳥殷勤為探看。",
        audioUrl: poemAudioUrl("wu-ti-xiang-jian-shi-nan-bie-yi-nan"),
      },
    ],
  },
  {
    key: "xia-ri-jue-ju",
    name: "夏日絕句 | 李清照",
    questions: [
      {
        content:
          "生(saang1)當(dong3)作(zok3)人(jan4)傑(git6)，死(sei2)亦(jik6)為(wai4)鬼(gwai2)雄(hung4)。至(zi3)今(gam1)思(si1)項(hong6)羽(jyu5)，不(bat1)肯(hang2)過(gwo3)江(gong1)東(dung1)。",
        originalText: "生当作人杰，死亦为鬼雄。至今思项羽，不肯过江东。",
        yueText: "生當作人傑，死亦為鬼雄。至今思項羽，不肯過江東。",
        audioUrl: poemAudioUrl("xia-ri-jue-ju"),
      },
    ],
  },
  {
    key: "xiao-chi",
    name: "小池 | 楊萬里",
    questions: [
      {
        content:
          "泉(cyun4)眼(ngaan5)無(mou4)聲(sing1)惜(sik1)細(sai3)流(lau4)，樹(syu6)陰(jam1)照(ziu3)水(seoi2)愛(oi3)晴(cing4)柔(jau4)。小(siu2)荷(ho4)才(coi4)露(lou6)尖(zim1)尖(zim1)角(gok3)，早(zou2)有(jau5)蜻(cing1)蜓(ting4)立(laap6)上(soeng6)頭(tau4)。",
        originalText: "泉眼无声惜细流，树阴照水爱晴柔。小荷才露尖尖角，早有蜻蜓立上头。",
        yueText: "泉眼無聲惜細流，樹陰照水愛晴柔。小荷才露尖尖角，早有蜻蜓立上頭。",
        audioUrl: poemAudioUrl("xiao-chi"),
      },
    ],
  },
  {
    key: "ye-yu-ji-bei",
    name: "夜雨寄北 | 李商隱",
    questions: [
      {
        content:
          "君(gwan1)問(man6)歸(gwai1)期(kei4)未(mei6)有(jau5)期(kei4)，巴(baa1)山(saan1)夜(je6)雨(jyu5)漲(zoeng3)秋(cau1)池(ci4)。何(ho4)當(dong1)共(gung6)剪(zin2)西(sai1)窗(coeng1)燭(zuk1)，卻(koek3)話(waa6)巴(baa1)山(saan1)夜(je6)雨(jyu5)時(si4)。",
        originalText: "君问归期未有期，巴山夜雨涨秋池。何当共剪西窗烛，却话巴山夜雨时。",
        yueText: "君問歸期未有期，巴山夜雨漲秋池。何當共剪西窗燭，卻話巴山夜雨時。",
        audioUrl: poemAudioUrl("ye-yu-ji-bei"),
      },
    ],
  },
  {
    key: "yuan-ri",
    name: "元日 | 王安石",
    questions: [
      {
        content:
          "爆(paau3)竹(zuk1)聲(sing1)中(zung1)一(jat1)歲(seoi3)除(ceoi4)，春(ceon1)風(fung1)送(sung3)暖(nyun5)入(jap6)屠(tou4)蘇(sou1)。千(cin1)門(mun4)萬(maan6)戶(wu6)曈(tung4)曈(tung4)日(jat6)，總(zung2)把(baa2)新(san1)桃(tou4)換(wun6)舊(gau6)符(fu4)。",
        originalText: "爆竹声中一岁除，春风送暖入屠苏。千门万户曈曈日，总把新桃换旧符。",
        yueText: "爆竹聲中一歲除，春風送暖入屠蘇。千門萬戶曈曈日，總把新桃換舊符。",
        audioUrl: poemAudioUrl("yuan-ri"),
      },
    ],
  },
];

export type CategoryShilizi = (typeof categoryShilizi)[number];
export type CategoryShiliziV2 = (typeof categoryShiliziV2)[number];
export { categoryShiliziV2 };
export default categoryShilizi;
