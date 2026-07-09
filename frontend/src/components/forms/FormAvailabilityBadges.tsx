import type { FormDefinition } from '../../api/forms';
import {
  ANDROID_AVAILABILITY_LABELS,
  WEB_AVAILABILITY_LABELS,
  getAndroidAvailability,
  getWebAvailability,
} from '../../form-studio/form-lifecycle';

interface Props {
  form: FormDefinition;
  showSyncCheck?: boolean;
  inMobileBootstrap?: boolean;
}

export function FormAvailabilityBadges({ form, showSyncCheck, inMobileBootstrap }: Props) {
  const android = getAndroidAvailability(form);
  const web = getWebAvailability(form);

  return (
    <div className="form-availability-badges">
      <span
        className={`form-avail-badge android android-${android}`}
        title={ANDROID_AVAILABILITY_LABELS[android]}
      >
        📱 {ANDROID_AVAILABILITY_LABELS[android]}
        {showSyncCheck && inMobileBootstrap !== undefined ? (
          <span className="form-sync-indicator">
            {inMobileBootstrap ? ' · listo en celular' : ' · pendiente en celular'}
          </span>
        ) : null}
      </span>
      <span className={`form-avail-badge web web-${web}`} title={WEB_AVAILABILITY_LABELS[web]}>
        🌐 {WEB_AVAILABILITY_LABELS[web]}
      </span>
    </div>
  );
}
