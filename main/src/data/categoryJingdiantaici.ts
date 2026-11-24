// 经典台词跟读大赛 | 高交会
type JingdiantaiciQuestion = {
  content: string;
  originalText: string;
  yueText: string;
  audioUrl?: string;
  /** 表演风格 */
  style?: string;
};

// Local clips: public/audio/lines/*.wav
function lineAudioUrl(name: string): string {
  return `/audio/lines/${encodeURIComponent(name)}.wav`;
}

const categoryJingdiantaici: {
  key: string;
  name: string;
  questions: JingdiantaiciQuestion[];
}[] = [
  {
    key: "taici-xjzw",
    name: "喜剧之王",
    questions: [
      {
        content: "我(ngo5)養(joeng5)你(nei5)啊(aa3)！",
        originalText: "我养你啊！",
        yueText: "我養你啊！",
        audioUrl: lineAudioUrl("我养你啊"),
        style: "深情",
      },
      {
        content: "其(kei4)實(sat6)我(ngo5)係(hai6)一(jat1)個(go3)演(jin2)員(jyun4)。",
        originalText: "其实我系一个演员。",
        yueText: "其實我係一個演員。",
        audioUrl: lineAudioUrl("其实我是一个演员"),
        style: "认真",
      },
    ],
  },
  {
    key: "taici-slzq",
    name: "少林足球",
    questions: [
      {
        content:
          "做(zou6)人(jan4)如(jyu4)果(gwo2)冇(mou5)夢(mung6)想(soeng2)，同(tung4)條(tiu4)鹹(haam4)魚(jyu4)有(jau5)咩(me1)分(fan1)別(bit6)？",
        originalText: "做人如果冇梦想，同条咸鱼有咩分别？",
        yueText: "做人如果冇夢想，同條鹹魚有咩分別？",
        audioUrl: lineAudioUrl("没梦想和咸鱼有什么区别"),
        style: "励志",
      },
      {
        content:
          "你(nei5)快(faai3)啲(di1)返(faan1)火(fo2)星(sing1)啦(laa1)，地(dei6)球(kau4)好(hou2)危(ngai4)險(him2)㗎(gaa3)！",
        originalText: "你快啲返火星啦，地球好危险㗎！",
        yueText: "你快啲返火星啦，地球好危險㗎！",
        audioUrl: lineAudioUrl("快点回火星"),
        style: "无厘头",
      },
    ],
  },
  {
    key: "taici-ss",
    name: "食神",
    questions: [
      {
        content: "我(ngo5)真(zan1)係(hai6)恭(gung1)喜(hei2)你(nei5)啊(aa3)！",
        originalText: "我真系恭喜你啊！",
        yueText: "我真係恭喜你啊！",
        audioUrl: lineAudioUrl("我真是恭喜你"),
        style: "反讽",
      },
      {
        content: "方(fong1)丈(zoeng6)份(fan6)人(jan4)好(hou2)小(siu2)器(hei3)。",
        originalText: "方丈份人好小器。",
        yueText: "方丈份人好小器。",
        audioUrl: lineAudioUrl("方丈小器"),
        style: "搞笑",
      },
    ],
  },
  {
    key: "taici-wjd",
    name: "无间道",
    questions: [
      {
        content: "對(deoi3)唔(m4)住(zyu6)，我(ngo5)係(hai6)差(caai1)人(jan4)。",
        originalText: "对唔住，我系差人。",
        yueText: "對唔住，我係差人。",
        audioUrl: lineAudioUrl("对不起我是差人"),
        style: "冷峻",
      },
      {
        content:
          "我(ngo5)以(ji5)前(cin4)無(mou4)得(dak1)揀(gaan2)，我(ngo5)宜(ji4)家(gaa1)想(soeng2)揀(gaan2)翻(faan1)做(zou6)好(hou2)人(jan4)。",
        originalText: "我以前无得拣，我宜家想拣翻做好人。",
        yueText: "我以前無得揀，我宜家想揀翻做好人。",
        audioUrl: lineAudioUrl("我想做个好人"),
        style: "恳切",
      },
      // 无间道2
      {
        content: "出(ceot1)嚟(lai4)行(haang4)，遲(ci4)早(zou2)要(jiu3)還(waan4)。",
        originalText: "出嚟行，迟早要还。",
        yueText: "出嚟行，遲早要還。",
        audioUrl: lineAudioUrl("出来行迟早要还"),
        style: "深沉",
      },
    ],
  },
  {
    key: "taici-dhxy",
    name: "大话西游",
    questions: [
      {
        content: "打(daa2)雷(leoi4)喇(laa3)！落(lok6)雨(jyu5)收(sau1)衫(saam1)啊(aa3)！",
        originalText: "打雷喇！落雨收衫啊！",
        yueText: "打雷喇！落雨收衫啊！",
        audioUrl: lineAudioUrl("打雷收衫"),
        style: "搞笑",
      },
      {
        content: "愛(oi3)一(jat1)個(go3)人(jan4)需(seoi1)要(jiu3)理(lei5)由(jau4)嘅(ge3)咩(me1)？",
        originalText: "爱一个人需要理由嘅咩？",
        yueText: "愛一個人需要理由嘅咩？",
        audioUrl: lineAudioUrl("爱一个人需要理由吗"),
        style: "疑惑",
      },
      {
        content: "我(ngo5)希(hei1)望(mong6)係(hai6)一(jat1)萬(maan6)年(nin4)。",
        originalText: "我希望系一万年。",
        yueText: "我希望係一萬年。",
        audioUrl: lineAudioUrl("我希望是一万年"),
        style: "深情",
      },
      {
        content: "佢(keoi5)好(hou2)似(ci5)一(jat1)條(tiu4)狗(gau2)啊(aa3)。",
        originalText: "佢好似一条狗啊。",
        yueText: "佢好似一條狗啊。",
        audioUrl: lineAudioUrl("他好像一条狗"),
        style: "感慨",
      },
    ],
  },
];

export type CategoryJingdiantaici = (typeof categoryJingdiantaici)[number];
export default categoryJingdiantaici;
