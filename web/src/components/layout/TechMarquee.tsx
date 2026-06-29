import { getTechLogo } from "../../content/techLogos";
import { useI18n } from "../../i18n/useI18n";
import { ScrollReveal } from "../ui/ScrollReveal";
import "./TechMarquee.css";

export function TechMarquee() {
  const { t } = useI18n();
  const stellarStack = t.stellarStack;
  const marqueeItems = [...stellarStack.items, ...stellarStack.items];

  return (
    <section className="tech-marquee" aria-labelledby="tech-marquee-title">
      <ScrollReveal className="tech-marquee__intro">
        <p id="tech-marquee-title" className="tech-marquee__label">{stellarStack.label}</p>
        <p className="tech-marquee__lead">{stellarStack.lead}</p>
      </ScrollReveal>

      <div className="tech-marquee__track-wrap" aria-hidden="true">
        <div className="tech-marquee__track">
          {marqueeItems.map((item, index) => {
            const logoSrc = getTechLogo(item.id);
            return (
              <span key={`${item.id}-${index}`} className="tech-marquee__pill">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt=""
                    className="tech-marquee__pill-logo"
                    width={28}
                    height={28}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <span className="tech-marquee__pill-copy">
                  <span className="tech-marquee__pill-name">{item.name}</span>
                  <span className="tech-marquee__pill-hint">{item.hint}</span>
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
