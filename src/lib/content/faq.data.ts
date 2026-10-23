export interface FaqEntry {
	question: string;
	answer: string;
}

export const FAQ_ITEMS: FaqEntry[] = [
	{
		question: 'How do I enroll in a course?',
		answer:
			'Create a free account, browse the course catalog, and open any course to see its full curriculum. Once signed in, you can enroll directly from the course page. Free courses grant access immediately; paid courses walk you through checkout first.'
	},
	{
		question: 'How do I access my purchased courses?',
		answer:
			'All the courses you are enrolled in are available from your student dashboard, where you can jump back into any course and pick up where you left off.'
	},
	{
		question: 'Are there free courses available?',
		answer:
			'Yes. Courses are individually priced by their instructor - some are completely free, others are paid. You can filter the catalog by "Free" access at any time.'
	},
	{
		question: 'Can I learn on mobile devices?',
		answer:
			'Yes, the entire platform is responsive and works on desktop, tablet, and mobile browsers, so you can continue a course from any device.'
	},
	{
		question: 'Do I receive a certificate when I finish a course?',
		answer:
			'Courses that offer a certificate of completion are marked on their course page. Completing every mandatory lesson in that course triggers your certificate.'
	},
	{
		question: 'How does course progress work?',
		answer:
			'Your progress is calculated from the mandatory lessons you have completed in a course. Optional lessons are tracked separately and never lower your required progress, and a completed lesson is never marked incomplete again.'
	},
	{
		question: 'Can I pause and continue learning later?',
		answer:
			'Yes. Courses are fully self-paced - your progress is saved per lesson, so you can leave at any point and resume exactly where you stopped.'
	},
	{
		question: 'Can I download learning resources?',
		answer:
			'Where an instructor has attached downloadable resources to a lesson, you can download them directly from that lesson.'
	},
	{
		question: 'What payment methods are supported?',
		answer:
			'Payment options are shown at checkout when you enroll in a paid course. Instructions and confirmation status are visible from your enrollment.'
	},
	{
		question: 'How do promo codes work?',
		answer: 'Enter your promo code at checkout to see the discounted price before you enroll.'
	},
	{
		question: 'Can I request a refund?',
		answer:
			'Refund requests are handled by our support team on a case-by-case basis. Contact us through the Contact page with your enrollment details and we will get back to you.'
	},
	{
		question: 'How long do I have access to purchased courses?',
		answer:
			'Once enrolled, you have full lifetime access to a course - there is no expiration date on your enrollment.'
	},
	{
		question: 'Can I reset my password?',
		answer: 'Use the "Forgot password" link on the sign-in page to receive a reset link by email.'
	},
	{
		question: 'How do I verify my email address?',
		answer:
			'After registering, we send a verification link to your email. Verifying your email helps secure your account and is required for some account actions.'
	},
	{
		question: 'Can I sign in with Google?',
		answer:
			'Yes, you can create an account or sign in using your Google account from the sign-in page, without setting a separate password.'
	},
	{
		question: 'How do notifications work?',
		answer:
			'You will receive in-app notifications for things like course updates and account activity. You can review and manage them from the notification bell in your dashboard.'
	},
	{
		question: 'How can instructors update courses?',
		answer:
			'Instructors and administrators manage course content - sections, lessons, pricing, and publishing status - from the instructor and admin tools. Updates to published courses are reflected for enrolled students automatically.'
	},
	{
		question: 'Can I access lessons offline?',
		answer:
			'Course lessons are delivered online, so an internet connection is required to stream video content and mark lessons complete. Any resources an instructor makes downloadable can be saved for offline reference.'
	},
	{
		question: 'How can I contact support?',
		answer:
			'Reach out through the Contact page and our team will get back to you. You can also check the Help Center for answers to common questions.'
	}
];

/** The same questions in Amharic: the default FAQ of the Amharic site (`/am`). */
export const FAQ_ITEMS_AM: FaqEntry[] = [
	{
		question: 'በኮርስ እንዴት መመዝገብ እችላለሁ?',
		answer:
			'ነጻ መለያ ይፍጠሩ፣ የኮርሶችን ዝርዝር ያስሱ፣ ከዚያም ሙሉ ሥርዓተ ትምህርቱን ለማየት የፈለጉትን ኮርስ ይክፈቱ። ከገቡ በኋላ ከኮርሱ ገጽ በቀጥታ መመዝገብ ይችላሉ። ነጻ ኮርሶች ወዲያውኑ ይከፈቱልዎታል፤ የሚከፈልባቸው ኮርሶች ደግሞ መጀመሪያ በክፍያ ሂደቱ ይመሩዎታል።'
	},
	{
		question: 'የገዛኋቸውን ኮርሶች እንዴት ማግኘት እችላለሁ?',
		answer:
			'የተመዘገቡባቸው ኮርሶች በሙሉ በተማሪ ዳሽቦርድዎ ላይ ይገኛሉ። ከዚያ ወደ የትኛውም ኮርስ ተመልሰው ካቆሙበት መቀጠል ይችላሉ።'
	},
	{
		question: 'ነጻ ኮርሶች አሉ?',
		answer:
			'አዎ። የእያንዳንዱ ኮርስ ዋጋ በአሰልጣኙ ይወሰናል፤ አንዳንዶቹ ሙሉ በሙሉ ነጻ ሲሆኑ ሌሎቹ ይከፈልባቸዋል። በማንኛውም ጊዜ የኮርሶችን ዝርዝር "ነጻ" በሚለው ማጣሪያ መለየት ይችላሉ።'
	},
	{
		question: 'በሞባይል መማር እችላለሁ?',
		answer:
			'አዎ፣ መድረኩ በሙሉ በኮምፒውተር፣ በታብሌት እና በሞባይል ብራውዘሮች ላይ ምቹ ሆኖ ይሠራል፤ ስለዚህ ኮርስዎን ከየትኛውም መሣሪያ መቀጠል ይችላሉ።'
	},
	{
		question: 'ኮርስ ስጨርስ ሰርተፊኬት አገኛለሁ?',
		answer:
			'የማጠናቀቂያ ሰርተፊኬት የሚሰጡ ኮርሶች በኮርስ ገጻቸው ላይ ተገልጿል። በዚያ ኮርስ ውስጥ ያሉትን አስገዳጅ ትምህርቶች በሙሉ ሲያጠናቅቁ ሰርተፊኬትዎ ይዘጋጅልዎታል።'
	},
	{
		question: 'የኮርስ ሂደት እንዴት ይሰላል?',
		answer:
			'ሂደትዎ የሚሰላው በኮርሱ ውስጥ ካጠናቀቋቸው አስገዳጅ ትምህርቶች ነው። አማራጭ ትምህርቶች ለብቻቸው ይመዘገባሉ እንጂ የሚጠበቅብዎትን ሂደት አይቀንሱም፤ የተጠናቀቀ ትምህርትም ዳግመኛ እንዳልተጠናቀቀ አይቆጠርም።'
	},
	{
		question: 'ትምህርቴን አቋርጬ በኋላ መቀጠል እችላለሁ?',
		answer:
			'አዎ። ኮርሶቹ ሙሉ በሙሉ በራስዎ ፍጥነት የሚማሩባቸው ናቸው፤ ሂደትዎ በየትምህርቱ ስለሚቀመጥ በማንኛውም ጊዜ አቁመው ካቆሙበት በትክክል መቀጠል ይችላሉ።'
	},
	{
		question: 'የመማሪያ ግብዓቶችን ማውረድ እችላለሁ?',
		answer:
			'አሰልጣኙ ሊወርዱ የሚችሉ ግብዓቶችን ከትምህርቱ ጋር ካያያዘ፣ ከዚያው ትምህርት በቀጥታ ማውረድ ይችላሉ።'
	},
	{
		question: 'ምን ዓይነት የክፍያ መንገዶችን መጠቀም እችላለሁ?',
		answer:
			'በሚከፈልበት ኮርስ ሲመዘገቡ የክፍያ አማራጮቹ በክፍያ ገጹ ላይ ይታያሉ። የክፍያ መመሪያዎችን እና የማረጋገጫ ሁኔታውን ከምዝገባዎ ላይ ማየት ይችላሉ።'
	},
	{
		question: 'የቅናሽ ኮድ እንዴት ይሠራል?',
		answer: 'ከመመዝገብዎ በፊት የቅናሹን ዋጋ ለማየት የቅናሽ ኮድዎን በክፍያ ገጹ ላይ ያስገቡ።'
	},
	{
		question: 'የከፈልኩት ገንዘብ እንዲመለስልኝ መጠየቅ እችላለሁ?',
		answer:
			'የተመላሽ ገንዘብ ጥያቄዎችን የድጋፍ ቡድናችን እንደየሁኔታው ያያቸዋል። የምዝገባዎን ዝርዝር ይዘው በ"ያግኙን" ገጽ በኩል ይጻፉልን፤ በቅርቡ ምላሽ እንሰጥዎታለን።'
	},
	{
		question: 'የገዛሁትን ኮርስ ለምን ያህል ጊዜ መጠቀም እችላለሁ?',
		answer:
			'አንዴ ከተመዘገቡ ኮርሱን ዕድሜ ልክ ሙሉ በሙሉ መጠቀም ይችላሉ፤ ምዝገባዎ የሚያበቃበት ቀን የለውም።'
	},
	{
		question: 'የይለፍ ቃሌን ዳግም ማስጀመር እችላለሁ?',
		answer:
			'በመግቢያ ገጹ ላይ ያለውን "የይለፍ ቃል ረሱ?" የሚለውን ሊንክ ይጫኑ፤ የይለፍ ቃል ዳግም ማስጀመሪያ ሊንክ በኢሜይል ይላክልዎታል።'
	},
	{
		question: 'ኢሜይሌን እንዴት አረጋግጣለሁ?',
		answer:
			'ከተመዘገቡ በኋላ የማረጋገጫ ሊንክ ወደ ኢሜይልዎ እንልካለን። ኢሜይልዎን ማረጋገጥ የመለያዎን ደህንነት ያጠናክራል፤ ለአንዳንድ የመለያ ተግባራትም አስፈላጊ ነው።'
	},
	{
		question: 'በGoogle መግባት እችላለሁ?',
		answer:
			'አዎ፣ በመግቢያ ገጹ ላይ የGoogle መለያዎን ተጠቅመው የተለየ የይለፍ ቃል ሳያዘጋጁ መለያ መፍጠር ወይም መግባት ይችላሉ።'
	},
	{
		question: 'ማሳወቂያዎች እንዴት ይሠራሉ?',
		answer:
			'እንደ የኮርስ ማሻሻያዎች እና የመለያ እንቅስቃሴዎች ላሉ ጉዳዮች በመድረኩ ውስጥ ማሳወቂያ ይደርስዎታል። በዳሽቦርድዎ ላይ ባለው የደወል ምልክት ማሳወቂያዎችዎን ማየት እና ማስተዳደር ይችላሉ።'
	},
	{
		question: 'አሰልጣኞች ኮርሶችን እንዴት ያሻሽላሉ?',
		answer:
			'አሰልጣኞች እና አስተዳዳሪዎች የኮርስ ይዘትን (ክፍሎችን፣ ትምህርቶችን፣ ዋጋን እና ይፋ የመሆን ሁኔታን) በአሰልጣኝ እና በአስተዳዳሪ መሣሪያዎች ያስተዳድራሉ። ይፋ በሆኑ ኮርሶች ላይ የሚደረጉ ለውጦች ለተመዘገቡ ተማሪዎች በራስ-ሰር ይታያሉ።'
	},
	{
		question: 'ያለ ኢንተርኔት ትምህርቶችን መከታተል እችላለሁ?',
		answer:
			'ትምህርቶቹ የሚቀርቡት በኦንላይን ስለሆነ ቪዲዮዎችን ለማየት እና ትምህርቶችን እንደተጠናቀቁ ምልክት ለማድረግ የኢንተርኔት ግንኙነት ያስፈልጋል። አሰልጣኙ እንዲወርዱ የፈቀዳቸውን ግብዓቶች ግን አውርደው ያለ ኢንተርኔት መጠቀም ይችላሉ።'
	},
	{
		question: 'የድጋፍ ቡድኑን እንዴት ማግኘት እችላለሁ?',
		answer:
			'በ"ያግኙን" ገጽ በኩል ይጻፉልን፤ ቡድናችን ምላሽ ይሰጥዎታል። ለተለመዱ ጥያቄዎች መልስ ለማግኘት የእገዛ ማዕከሉንም መመልከት ይችላሉ።'
	}
];
