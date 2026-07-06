package com.agroerp.prm.ui

import android.content.Intent
import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.fragment.app.commit
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import com.agroerp.prm.sync.FarmSyncWorker
import com.agroerp.prm.sync.EneacSyncWorker
import com.agroerp.prm.sync.FieldLotSyncWorker
import com.agroerp.prm.sync.ProducerSyncWorker
import com.agroerp.prm.sync.WorkflowSyncWorker
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.agroerp.prm.ui.farm.list.FarmListFragment
import com.agroerp.prm.ui.list.ProducerListFragment
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private val locationPermission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { /* handled per screen */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val app = application as AgroErpApp
        if (!app.authRepository.isLoggedIn) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_main)
        setSupportActionBar(findViewById(R.id.toolbar))

        val bottomNav = findViewById<BottomNavigationView>(R.id.bottomNav)
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> {
                    supportFragmentManager.commit {
                        replace(R.id.fragmentContainer, ProducerListFragment())
                    }
                    supportActionBar?.title = getString(R.string.app_name)
                    true
                }
                R.id.nav_producers -> {
                    supportFragmentManager.commit {
                        replace(R.id.fragmentContainer, ProducerListFragment())
                    }
                    supportActionBar?.title = "Productores"
                    true
                }
                R.id.nav_work -> {
                    supportFragmentManager.commit {
                        replace(R.id.fragmentContainer, com.agroerp.prm.ui.workflow.WorkflowInboxFragment())
                    }
                    supportActionBar?.title = "Bandeja de tareas"
                    true
                }
                R.id.nav_notifications -> {
                    supportFragmentManager.commit {
                        replace(R.id.fragmentContainer, com.agroerp.prm.ui.eneac.NotificationsFragment())
                    }
                    supportActionBar?.title = "Notificaciones"
                    true
                }
                R.id.nav_more -> {
                    openOptionsMenu()
                    true
                }
                else -> false
            }
        }

        if (savedInstanceState == null) {
            supportFragmentManager.commit {
                replace(R.id.fragmentContainer, ProducerListFragment())
            }
        }

        scheduleSync()
        requestLocationIfNeeded()
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_producers -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, ProducerListFragment())
                }
                true
            }
            R.id.action_farms -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, FarmListFragment())
                }
                true
            }
            R.id.action_lots -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.lot.list.LotListFragment())
                }
                true
            }
            R.id.action_gis -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.gis.GisMapFragment())
                }
                true
            }
            R.id.action_workflow -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.workflow.WorkflowInboxFragment())
                }
                true
            }
            R.id.action_notifications -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eneac.NotificationsFragment())
                }
                true
            }
            R.id.action_bi -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.bi.BiDashboardFragment())
                }
                true
            }
            R.id.action_ai -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.ai.AiChatFragment())
                }
                true
            }
            R.id.action_integration -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eih.EihFragment())
                }
                true
            }
            R.id.action_eip -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eip.EipFragment())
                }
                true
            }
            R.id.action_eint -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eint.EintFragment())
                }
                true
            }
            R.id.action_eops -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eops.EopsFragment())
                }
                true
            }
            R.id.action_eatp -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eatp.EatpFragment())
                }
                true
            }
            R.id.action_eapp -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eapp.EappFragment())
                }
                true
            }
            R.id.action_eiwp -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eiwp.EiwpFragment())
                }
                true
            }
            R.id.action_ephp -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.ephp.EphpFragment())
                }
                true
            }
            R.id.action_eatr -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eatr.EatrFragment())
                }
                true
            }
            R.id.action_eacc -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eacc.EaccFragment())
                }
                true
            }
            R.id.action_effm -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.effm.EffmFragment())
                }
                true
            }
            R.id.action_eaip -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eaip.EaipFragment())
                }
                true
            }
            R.id.action_eace -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eace.EaceFragment())
                }
                true
            }
            R.id.action_observability -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eop.EopFragment())
                }
                true
            }
            R.id.action_performance -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.epop.EpopFragment())
                }
                true
            }
            R.id.action_coffee -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.cpep.CpepFragment())
                }
                true
            }
            R.id.action_eims -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eims.EimsFragment())
                }
                true
            }
            R.id.action_escm -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.escm.EscmFragment())
                }
                true
            }
            R.id.action_efm -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.efm.EfmFragment())
                }
                true
            }
            R.id.action_hcm -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.hcm.HcmFragment())
                }
                true
            }
            R.id.action_portal -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.portal.PortalFragment())
                }
                true
            }
            R.id.action_hed -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.hed.HedFragment())
                }
                true
            }
            R.id.action_hpa -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.hpa.HpaFragment())
                }
                true
            }
            R.id.action_emfg -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.emfg.EmfgFragment())
                }
                true
            }
            R.id.action_epscm -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.epscm.EpscmFragment())
                }
                true
            }
            R.id.action_eam -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eam.EamFragment())
                }
                true
            }
            R.id.action_iot -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eiesdp.IotFragment())
                }
                true
            }
            R.id.action_plugins -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.eppm.PluginsFragment())
                }
                true
            }
            R.id.action_scheduler -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.esdje.SchedulerFragment())
                }
                true
            }
            R.id.action_rules -> {
                supportFragmentManager.commit {
                    replace(R.id.fragmentContainer, com.agroerp.prm.ui.bre.RulesFragment())
                }
                true
            }
            R.id.action_sync -> {
                val app = application as AgroErpApp
                Thread {
                    kotlinx.coroutines.runBlocking {
                        try {
                            app.repository.pullFromServer()
                            app.repository.pushPendingSync()
                            app.farmRepository.pullFromServer()
                            app.farmRepository.pushPendingSync()
                            app.fieldLotRepository.pullFromServer()
                            app.fieldLotRepository.pushPendingSync()
                            app.workflowRepository.fetchInbox()
                            app.workflowRepository.pushPendingTransitions()
                            app.eneacRepository.fetchInbox()
                            app.eneacRepository.syncMobile()
                            app.breRepository.syncOffline()
                            app.schedulerRepository.syncOffline()
                            app.pluginsRepository.syncOffline()
                            app.iotRepository.syncOffline()
                            app.eimsRepository.syncOffline()
                            app.escmRepository.syncOffline()
                            app.efmRepository.syncOffline()
                        } catch (_: Exception) { }
                    }
                }.start()
                true
            }
            R.id.action_logout -> {
                val app = application as AgroErpApp
                app.authRepository.logout()
                startActivity(Intent(this, LoginActivity::class.java))
                finish()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun scheduleSync() {
        val prmRequest = PeriodicWorkRequestBuilder<ProducerSyncWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "prm_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            prmRequest,
        )
        val farmRequest = PeriodicWorkRequestBuilder<FarmSyncWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "ftip_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            farmRequest,
        )
        val lotRequest = PeriodicWorkRequestBuilder<FieldLotSyncWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "fmdt_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            lotRequest,
        )
        val workflowRequest = PeriodicWorkRequestBuilder<WorkflowSyncWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "workflow_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            workflowRequest,
        )
        val eneacRequest = PeriodicWorkRequestBuilder<EneacSyncWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "eneac_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            eneacRequest,
        )
    }

    private fun requestLocationIfNeeded() {
        val needed = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
        ).any {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed) locationPermission.launch(
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            ),
        )
    }
}
