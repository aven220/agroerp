package com.agroerp.prm

import android.app.Application
import com.agroerp.prm.data.db.AppDatabase
import com.agroerp.prm.data.repository.FarmRepository
import com.agroerp.prm.data.repository.FieldLotRepository
import com.agroerp.prm.data.repository.EneacRepository
import com.agroerp.prm.data.repository.BiRepository
import com.agroerp.prm.data.repository.AiRepository
import com.agroerp.prm.data.repository.EamipRepository
import com.agroerp.prm.data.repository.BreRepository
import com.agroerp.prm.data.repository.SchedulerRepository
import com.agroerp.prm.data.repository.PluginsRepository
import com.agroerp.prm.data.repository.IotRepository
import com.agroerp.prm.data.repository.EihRepository
import com.agroerp.prm.data.repository.EopRepository
import com.agroerp.prm.data.repository.EpopRepository
import com.agroerp.prm.data.repository.CpepRepository
import com.agroerp.prm.data.repository.EimsRepository
import com.agroerp.prm.data.repository.EscmRepository
import com.agroerp.prm.data.repository.EfmRepository
import com.agroerp.prm.data.repository.HcmRepository
import com.agroerp.prm.data.repository.PortalRepository
import com.agroerp.prm.data.repository.HedRepository
import com.agroerp.prm.data.repository.HpaRepository
import com.agroerp.prm.data.repository.EmfgRepository
import com.agroerp.prm.data.repository.EpscmRepository
import com.agroerp.prm.data.repository.EamRepository
import com.agroerp.prm.data.repository.GisRepository
import com.agroerp.prm.data.repository.ProducerRepository
import com.agroerp.prm.data.repository.AuthRepository
import com.agroerp.prm.data.repository.WorkflowRepository
import com.agroerp.prm.data.repository.BpmsRepository
import com.agroerp.prm.data.repository.EipRepository
import com.agroerp.prm.data.repository.EintRepository
import com.agroerp.prm.data.repository.EopsRepository
import com.agroerp.prm.data.repository.EatpRepository
import com.agroerp.prm.data.repository.EappRepository
import com.agroerp.prm.data.repository.EiwpRepository
import com.agroerp.prm.data.repository.EphpRepository
import com.agroerp.prm.data.repository.EatrRepository
import com.agroerp.prm.data.repository.EaccRepository
import com.agroerp.prm.data.repository.EffmRepository
import com.agroerp.prm.data.repository.EaipRepository
import com.agroerp.prm.data.repository.EaceRepository

class AgroErpApp : Application() {
    lateinit var repository: ProducerRepository
        private set
    lateinit var farmRepository: FarmRepository
        private set
    lateinit var fieldLotRepository: FieldLotRepository
        private set
    lateinit var gisRepository: GisRepository
        private set
    lateinit var workflowRepository: WorkflowRepository
        private set
    lateinit var bpmsRepository: BpmsRepository
        private set
    lateinit var eipRepository: EipRepository
        private set
    lateinit var eintRepository: EintRepository
        private set
    lateinit var eopsRepository: EopsRepository
        private set
    lateinit var eatpRepository: EatpRepository
        private set
    lateinit var eappRepository: EappRepository
        private set
    lateinit var eiwpRepository: EiwpRepository
        private set
    lateinit var ephpRepository: EphpRepository
    lateinit var eatrRepository: EatrRepository
    lateinit var eaccRepository: EaccRepository
    lateinit var effmRepository: EffmRepository
        private set
    lateinit var eaipRepository: EaipRepository
        private set
    lateinit var eaceRepository: EaceRepository
        private set
    lateinit var eneacRepository: EneacRepository
        private set
    lateinit var biRepository: BiRepository
        private set
    lateinit var aiRepository: AiRepository
        private set
    lateinit var eamipRepository: EamipRepository
        private set
    lateinit var authRepository: AuthRepository
        private set
    lateinit var breRepository: BreRepository
        private set
    lateinit var schedulerRepository: SchedulerRepository
        private set
    lateinit var pluginsRepository: PluginsRepository
        private set
    lateinit var iotRepository: IotRepository
        private set
    lateinit var eihRepository: EihRepository
        private set
    lateinit var eopRepository: EopRepository
        private set
    lateinit var epopRepository: EpopRepository
        private set
    lateinit var cpepRepository: CpepRepository
        private set
    lateinit var eimsRepository: EimsRepository
        private set
    lateinit var escmRepository: EscmRepository
        private set
    lateinit var efmRepository: EfmRepository
        private set
    lateinit var hcmRepository: HcmRepository
        private set
    lateinit var portalRepository: PortalRepository
        private set
    lateinit var hedRepository: HedRepository
        private set
    lateinit var hpaRepository: HpaRepository
        private set
    lateinit var emfgRepository: EmfgRepository
        private set
    lateinit var epscmRepository: EpscmRepository
        private set
    lateinit var eamRepository: EamRepository
        private set

    override fun onCreate() {
        super.onCreate()
        authRepository = AuthRepository(this)
        breRepository = BreRepository(this)
        schedulerRepository = SchedulerRepository(this)
        pluginsRepository = PluginsRepository(this)
        iotRepository = IotRepository(this)
        eihRepository = EihRepository(this)
        eopRepository = EopRepository(this)
        epopRepository = EpopRepository(this)
        cpepRepository = CpepRepository(this)
        eimsRepository = EimsRepository(this)
        escmRepository = EscmRepository(this)
        efmRepository = EfmRepository(this)
        hcmRepository = HcmRepository(this)
        portalRepository = PortalRepository(this)
        hedRepository = HedRepository(this)
        hpaRepository = HpaRepository(this)
        emfgRepository = EmfgRepository(this)
        epscmRepository = EpscmRepository(this)
        eamRepository = EamRepository(this)
        val db = AppDatabase.getInstance(this)
        repository = ProducerRepository(this, db.producerDao(), db.syncQueueDao())
        farmRepository = FarmRepository(this, db.farmDao(), db.syncQueueDao())
        fieldLotRepository = FieldLotRepository(this, db.fieldLotDao(), db.syncQueueDao())
        gisRepository = GisRepository(this)
        workflowRepository = WorkflowRepository(this)
        bpmsRepository = BpmsRepository(this)
        eipRepository = EipRepository(this)
        eintRepository = EintRepository(this)
        eopsRepository = EopsRepository(this)
        eatpRepository = EatpRepository(this)
        eappRepository = EappRepository(this)
        eiwpRepository = EiwpRepository(this)
        ephpRepository = EphpRepository(this)
        eatrRepository = EatrRepository(this)
        eaccRepository = EaccRepository(this)
        effmRepository = EffmRepository(this)
        eaipRepository = EaipRepository(this)
        eaceRepository = EaceRepository(this)
        eneacRepository = EneacRepository(this)
        biRepository = BiRepository(this)
        aiRepository = AiRepository(this)
        eamipRepository = EamipRepository(this)
    }
}
