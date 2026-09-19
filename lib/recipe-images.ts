/**
 * High-resolution editorial photography registry for StickyMilk drinks.
 * Images sourced from Google Cloud studio generation in the Stitch prototype.
 */

export interface RecipeImage {
  imageUrl: string;
  imageAlt: string;
}

const DEFAULT_FALLBACK_IMAGE: RecipeImage = {
  imageUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDSB76YI4bEMnNBbhydwXDBinVLo3l2meOn1izkg4bEtCwwWD183lmMv1x_5Z78PCsZ-6egfqep8leo1jJqjuIPb1iHE_S-mSKphIKKcxBGqp2pQkSP86gZY6ayL46vz8M5K4XbZifafw3itB2mzxsMTB6XvDlRC47cevPMRknqknFvu98UcBAzTMAlLaOC4k9jLL70izHa3jatYePXL_tAIQ-ygIdivFzBxiMJUMRJAwYhMEp1KFI6tQ",
  imageAlt: "Editorial coffee and condensed milk drink on kitchen counter",
};

const RECIPE_IMAGES: Record<string, RecipeImage> = {
  "ca-phe-sua-da": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDSB76YI4bEMnNBbhydwXDBinVLo3l2meOn1izkg4bEtCwwWD183lmMv1x_5Z78PCsZ-6egfqep8leo1jJqjuIPb1iHE_S-mSKphIKKcxBGqp2pQkSP86gZY6ayL46vz8M5K4XbZifafw3itB2mzxsMTB6XvDlRC47cevPMRknqknFvu98UcBAzTMAlLaOC4k9jLL70izHa3jatYePXL_tAIQ-ygIdivFzBxiMJUMRJAwYhMEp1KFI6tQ",
    imageAlt: "Vietnamese iced coffee pouring over crystal ice into dense condensed milk at the base",
  },
  "ca-phe-sua-nong-phin-style-no-phin": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDvrOEJfJnZ9rwbm-CpHxCUDkB8QSBBYDs_O9sykRr5bFBIpmr4tRstqCZfQJRZvsuPoGcVmJpbOdfFrkn-LqHMMY6Ba05D3ETmFDem-gBLyxdoU7i7nQutSFDCDUuIGX4cSpeZo7CS5HE0zkWLcxHkUqt4sLhHgWokJMcfrV9yt1q8-zrgzyDZ9hVarPhIix6nYXuWrQgux8grLF6P_0PfIA3x-XwMsrZyi_5ee_05957i6NuladZzpQ",
    imageAlt: "Steaming hot Vietnamese milk coffee with dark coffee and warm condensed milk",
  },
  "black-cat-affogato": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAt7ZMRF4ymXF1GJr3HvoMwycpgUKCj9EsGy6lB6GKR-gAbLYjMnkadssG1iITdN7iOdpCinW07XChrbY_lPxEptsPaO9k4SSjdqega7XqSxaWtOSvDPNO9IQTvfD7B2uvyNZCdiBpE4D7JWq4q71tZOJU0llJ6enas-bGV0j03GzNMnEW9XTPB7jjAXuvqt9tsq7-Ho0U8aT-9vTbdExd6mXWVyYEsNTKE-n7b_3RJizNUGbBTy1Npqw",
    imageAlt: "Dark espresso melting through vanilla bean gelato in a ceramic coupe",
  },
  "sticky-latte": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDSB76YI4bEMnNBbhydwXDBinVLo3l2meOn1izkg4bEtCwwWD183lmMv1x_5Z78PCsZ-6egfqep8leo1jJqjuIPb1iHE_S-mSKphIKKcxBGqp2pQkSP86gZY6ayL46vz8M5K4XbZifafw3itB2mzxsMTB6XvDlRC47cevPMRknqknFvu98UcBAzTMAlLaOC4k9jLL70izHa3jatYePXL_tAIQ-ygIdivFzBxiMJUMRJAwYhMEp1KFI6tQ",
    imageAlt: "Sticky Latte with condensed milk ribbons, rich coffee, and cold milk over ice",
  },
  "classic-hot-latte": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDvrOEJfJnZ9rwbm-CpHxCUDkB8QSBBYDs_O9sykRr5bFBIpmr4tRstqCZfQJRZvsuPoGcVmJpbOdfFrkn-LqHMMY6Ba05D3ETmFDem-gBLyxdoU7i7nQutSFDCDUuIGX4cSpeZo7CS5HE0zkWLcxHkUqt4sLhHgWokJMcfrV9yt1q8-zrgzyDZ9hVarPhIix6nYXuWrQgux8grLF6P_0PfIA3x-XwMsrZyi_5ee_05957i6NuladZzpQ",
    imageAlt: "Classic hot latte with silky microfoam in a ceramic mug",
  },
  "classic-iced-latte": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB0usqnTwdQV_mbtnIzukT4o782lgLDZaPJf-4RZORtYfBsjVkkP8dI7w8IAW2KPw9X1sg6aWRNeqMH4w3NOxpFIwFKXqYytqgNhKZMq987ViCR_eAEk_xD376PTIJTrj1x4vJ37dn90ZkKWIo4PMMniy9kzpD9eGJW-MfzJkb6LBkW_9HgtfrsQ6w17XZbzcfBpyKIT3Lxk4VSAk7ChMIgDPO1Bvpu0T6wWbxpMXnzKtzE2BnPaoOeog",
    imageAlt: "Classic iced latte with cold creamy milk and espresso over cracked ice",
  },
  "vanilla-oat-latte": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB0usqnTwdQV_mbtnIzukT4o782lgLDZaPJf-4RZORtYfBsjVkkP8dI7w8IAW2KPw9X1sg6aWRNeqMH4w3NOxpFIwFKXqYytqgNhKZMq987ViCR_eAEk_xD376PTIJTrj1x4vJ37dn90ZkKWIo4PMMniy9kzpD9eGJW-MfzJkb6LBkW_9HgtfrsQ6w17XZbzcfBpyKIT3Lxk4VSAk7ChMIgDPO1Bvpu0T6wWbxpMXnzKtzE2BnPaoOeog",
    imageAlt: "Iced vanilla oat milk latte swirling with coffee over ice",
  },
  "maple-cinnamon-latte": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDvrOEJfJnZ9rwbm-CpHxCUDkB8QSBBYDs_O9sykRr5bFBIpmr4tRstqCZfQJRZvsuPoGcVmJpbOdfFrkn-LqHMMY6Ba05D3ETmFDem-gBLyxdoU7i7nQutSFDCDUuIGX4cSpeZo7CS5HE0zkWLcxHkUqt4sLhHgWokJMcfrV9yt1q8-zrgzyDZ9hVarPhIix6nYXuWrQgux8grLF6P_0PfIA3x-XwMsrZyi_5ee_05957i6NuladZzpQ",
    imageAlt: "Hot maple cinnamon latte dusted with ground cinnamon",
  },
  "frozen-coffee-martini": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC9Ri5_MTz7dP5QDrdEDpoGdphKa7yrqJOifBawQInrC9Zwuur6pqNdmUrROgnQwvEOcjajx9gKx5UGkoRFQLz5LGhwKZ7N2ml5YswIuYof1NUbYxJP23hhEo25tYUeRT5D2upF3pSkqSVzJ8tLLZ062mnOZ2jGoLcMxdE3IINKfdKxK1yar7Gy0BwYOVcwbPkJEqgjCyIo4zWQeVDQVyrjTkRUZP2hMpSkv7IazwziGO4XQh3CbjhhoA",
    imageAlt: "Chilled espresso martini in a frosted coupe glass with rich foam",
  },
  "frozen-espresso-martini-two-puck": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC9Ri5_MTz7dP5QDrdEDpoGdphKa7yrqJOifBawQInrC9Zwuur6pqNdmUrROgnQwvEOcjajx9gKx5UGkoRFQLz5LGhwKZ7N2ml5YswIuYof1NUbYxJP23hhEo25tYUeRT5D2upF3pSkqSVzJ8tLLZ062mnOZ2jGoLcMxdE3IINKfdKxK1yar7Gy0BwYOVcwbPkJEqgjCyIo4zWQeVDQVyrjTkRUZP2hMpSkv7IazwziGO4XQh3CbjhhoA",
    imageAlt: "Double-strength frozen espresso martini with thick foam head",
  },
  "coffee-dirty-soda": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB4pR5agGn8EqvhgCL79T1_HaeGYHk3guuyFjxPMnhLzsI_8Xn1K9FDytSPoHgdUSBfAMmhBBI2mlC14b2sFCdYSKLfapN38Uxxyh4LkKujuoC_CnPEa5BqaTbnqbFmYwC1IksWDBXCLkSeuLOV8O8L3oqb0NB4gKIyQEfZuE6kBfednnN5DhIAA3U1fYJzQZjb_tsKL8fGMfXiVNHa1SXJtKEbdQpFuo7mwKTMD4xZVk0XDKTPYB99Vw",
    imageAlt: "Coffee dirty soda with cola, sweet cream, and coffee float in highball glass",
  },
  "maple-coffee-cream-soda": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB4pR5agGn8EqvhgCL79T1_HaeGYHk3guuyFjxPMnhLzsI_8Xn1K9FDytSPoHgdUSBfAMmhBBI2mlC14b2sFCdYSKLfapN38Uxxyh4LkKujuoC_CnPEa5BqaTbnqbFmYwC1IksWDBXCLkSeuLOV8O8L3oqb0NB4gKIyQEfZuE6kBfednnN5DhIAA3U1fYJzQZjb_tsKL8fGMfXiVNHa1SXJtKEbdQpFuo7mwKTMD4xZVk0XDKTPYB99Vw",
    imageAlt: "Sparkling maple coffee cream soda with effervescent bubbles over ice",
  },
  "grapefruit-coffee-tonic": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB4pR5agGn8EqvhgCL79T1_HaeGYHk3guuyFjxPMnhLzsI_8Xn1K9FDytSPoHgdUSBfAMmhBBI2mlC14b2sFCdYSKLfapN38Uxxyh4LkKujuoC_CnPEa5BqaTbnqbFmYwC1IksWDBXCLkSeuLOV8O8L3oqb0NB4gKIyQEfZuE6kBfednnN5DhIAA3U1fYJzQZjb_tsKL8fGMfXiVNHa1SXJtKEbdQpFuo7mwKTMD4xZVk0XDKTPYB99Vw",
    imageAlt: "Grapefruit coffee tonic with fresh citrus wheel and tonic bubbles",
  },
  "layered-coffee-tonic": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB4pR5agGn8EqvhgCL79T1_HaeGYHk3guuyFjxPMnhLzsI_8Xn1K9FDytSPoHgdUSBfAMmhBBI2mlC14b2sFCdYSKLfapN38Uxxyh4LkKujuoC_CnPEa5BqaTbnqbFmYwC1IksWDBXCLkSeuLOV8O8L3oqb0NB4gKIyQEfZuE6kBfednnN5DhIAA3U1fYJzQZjb_tsKL8fGMfXiVNHa1SXJtKEbdQpFuo7mwKTMD4xZVk0XDKTPYB99Vw",
    imageAlt: "Layered coffee tonic with dark coffee floating gracefully on clear tonic",
  },
  "salted-mocha-cometeer-shake": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB3LWGUbcna4QVwg9TJzWNxibR66A2rDeNf3uQkMmrBGOclY3-4A7KJs2B2h04VnJlimKC8wS7qp7_U2qltJygdy0yy5_RRRFtebJfxYQ1hWG8eFYQ2iRHyyKXRzVoztrWIPWJLBr50QZWk5NeCreVzf55g6OeyfdyLD2xay_aLSs8FIPaQ6RBFaKdQ2H9VSguz28tBbIiIax1tN5WcxRMo9ESTeY4cFPSMNVs924xT-tPlmAHEP5g86w",
    imageAlt: "Thick salted mocha shake with chocolate drizzle and flaky sea salt",
  },
  "four-serving-cometeer-tiramisu": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDrayUBV2peNQg8DPlqUSxRFTl-_p1WKyIB4qievqYLUPYbEXKa5dL-twMvYFbFLXh_L3WnApaYI47wtJRgUdNRSYVy2TD2USs5s_ZVDWtQ-TPOYruzGOzMQyy1NFZJZXP9L7Mnh3e2k0UZhIU-KR3pREaRtRSi4PstnLNUfrZQaYfRkpmCdBxnB3vB1EkzZ9DxJdHHlQaBBO74xKWQxmJLD0mYkx6zEdmLD1e1l22xoCdEiRZKhhhwdg",
    imageAlt: "Classic layered tiramisu with coffee-soaked ladyfingers and cocoa dusting",
  },
  "no-bake-tiramisu-cups": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDrayUBV2peNQg8DPlqUSxRFTl-_p1WKyIB4qievqYLUPYbEXKa5dL-twMvYFbFLXh_L3WnApaYI47wtJRgUdNRSYVy2TD2USs5s_ZVDWtQ-TPOYruzGOzMQyy1NFZJZXP9L7Mnh3e2k0UZhIU-KR3pREaRtRSi4PstnLNUfrZQaYfRkpmCdBxnB3vB1EkzZ9DxJdHHlQaBBO74xKWQxmJLD0mYkx6zEdmLD1e1l22xoCdEiRZKhhhwdg",
    imageAlt: "Individual no-bake tiramisu cups with mascarpone cream and espresso",
  },
  "one-bowl-mocha-skillet-cookie": {
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAt7ZMRF4ymXF1GJr3HvoMwycpgUKCj9EsGy6lB6GKR-gAbLYjMnkadssG1iITdN7iOdpCinW07XChrbY_lPxEptsPaO9k4SSjdqega7XqSxaWtOSvDPNO9IQTvfD7B2uvyNZCdiBpE4D7JWq4q71tZOJU0llJ6enas-bGV0j03GzNMnEW9XTPB7jjAXuvqt9tsq7-Ho0U8aT-9vTbdExd6mXWVyYEsNTKE-n7b_3RJizNUGbBTy1Npqw",
    imageAlt: "Warm mocha skillet cookie baked with chocolate chunks and coffee",
  },
};

export function getRecipeImage(slug: string): RecipeImage {
  return RECIPE_IMAGES[slug] ?? DEFAULT_FALLBACK_IMAGE;
}
