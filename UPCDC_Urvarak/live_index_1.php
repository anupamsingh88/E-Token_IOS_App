
	<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
	<html xmlns="http://www.w3.org/1999/xhtml">
	<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<meta charset="utf-8" />
	<link rel="icon" type="image/png" href="images/favicon.ico">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
	<title>Survey Form</title>

	<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" name="viewport" />
    <meta name="viewport" content="width=device-width" />
	
    <!--     Fonts and icons     -->
    <link href="fa/css/all.min.css" rel="stylesheet" media="all">
    <script src="fa/js/fontawesome.min.js"></script>
    <link href="css/pe-icon-7-stroke.css" rel="stylesheet"  media="all" />

    <!-- Bootstrap core CSS     -->
    <link rel="stylesheet" href="css/bootstrap.min.css" media="all">
	<link rel="stylesheet" href="css/bootstrap-theme.min.css" media="all">
	<link rel="stylesheet" href="dataTables/datatables.min.css" media="all">
	<script src="js/jquery.3.2.1.min.js" type="text/javascript"></script>
	<script src="js/jquery-ui.js" type="text/javascript"></script>
	<script src="js/popper.js"></script>
    <script src="js/bootstrap.min.js"></script>
    <script src="js/bootstrap-switch.js"></script>
	<script src="js/calendar.js" language="javascript" type="text/javascript"></script>
	<script src="js/bpopup.js" language="javascript" type="text/javascript"></script>
	<script src="jquery/jquery.ba-throttle-debouce.min.js" type="text/javascript"></script>
	<script src="jquery/jquery.multiselect.js" language="javascript"></script>

    <!-- Animation library for notifications   -->
    <link href="css/animate.min.css" rel="stylesheet" media="all"/>

    
    <link href="css/jquery-ui.css" rel="stylesheet" media="all"/>
	<!--
	<!--<link href="css/component.css" rel="stylesheet" type="text/css" media="all" />
	<link href="css/jcarousel.css" rel="stylesheet" type="text/css" media="all" />-->
	<link href="css/styles.css" rel="stylesheet" type="text/css" media="all" />
	<link href="css/pagination.css" rel="stylesheet" type="text/css" media="all" />
	<link href="css/jquery.multiselect.css" rel="stylesheet" type="text/css" media="all" />
	<!--  Light Bootstrap Table core CSS    -->
	<link href="css/light-bootstrap-dashboard.css?v=1.4.0" rel="stylesheet" media="all"/>


    <style type="text/css">
    	/* ========== STICKY FOOTER FIX ========== */
    	html, body {
    		height: 100%;
    		margin: 0;
    		padding: 0;
    	}
    	body {
    		display: flex;
    		flex-direction: column;
    	}
    	#wrapper {
    		display: flex;
    		flex-direction: row;
    		flex: 1;
    		min-height: 100vh;
    	}
    	.sidebar {
    		flex-shrink: 0;
    		/* If sidebar has fixed width, add it here */
    	}
    	.main-panel {
    		display: flex;
    		flex-direction: column;
    		flex: 1;
    		min-height: 100vh;
    	}
    	.main-panel > .content {
    		flex: 1;
    	}
    	.footer {
    		flex-shrink: 0;
    		margin-top: auto;
    		border-top: 1px solid #e3e3e3;
    	}
    	/* ========== END STICKY FOOTER FIX ========== */

        .nav_style li:hover{
            background-color: #b2b8ae;
        }
        .daterclass{
            padding: 5px;
            border: 2px solid lightblue;
        }
        .daterclass tr td{
          
        }

		@media (max-width: 767px) {
			.main-panel .navbar {
				position: relative;
				z-index: 9999 !important;
			}

			.main-panel .navbar-toggler {
				position: relative;
				z-index: 10000 !important;
				pointer-events: auto !important;
			}
		}

    </style>

	<link href="jquery/jquery-ui.css" rel="stylesheet" type="text/css" media="screen" />
	<style>
		#wrapper{
			border: 5px solid #;
		}
	</style>

	<script type="text/javascript" language="javascript">
		var software_type="pharma";
		$(document).ready( 
			function() {
				// Add the "focus" value to class attribute
				$("input").focusin( 
					function() {
						$(this).addClass("focus");
					}
				);
				$("select").focusin( 
					function() {
						$(this).addClass("focus");
					}
				);
				$(":checkbox").focusin( 
					function() {
						$(this).addClass("focus");
					}
				);
				// Remove the "focus" value to class attribute
				$("input").focusout( 
					function() {
						$(this).removeClass("focus");
					}
				);
				$("select").focusout( 
					function() {
						$(this).removeClass("focus");
					}
				);
				$(":checkbox").focusout( 
					function() {
						$(this).removeClass("focus");
					}
				);
				$('[data-toggle="tooltip"]').tooltip(); 
			}
		);

		$(function() {
			var options = {
				source: function (request, response){
					$.getJSON("scripts/ajax.php?id=nav",request, response);
				},
				position: {
					my: "left top",
					at: "left bottom",
					collision: "flip"
				},
				minLength: 1,
				select: function( event, ui ) {
					log( ui.item ?
						"Selected: " + ui.item.value + " aka " + ui.item.label :
						"Nothing selected, input was " + this.value );
				},
				select: function( event, ui ) {
					window.open(ui.item.hyper_link, "_self");
					return false;
				}
			};
		$("input#shortcut_command").on("keydown.autocomplete", function() {
			$(this).autocomplete(options);
		});
		});


	</script>
	<script language="javascript" type="text/javascript">
		function check_prev_date(form_date){
			calculate_total(1);
			var cur_date = "2026-09-23";
			var warn = 0;
			$(".noblank").each(function(index, element){
				if($(element).val()==""){
					$( element ).css( "backgroundColor", "yellow" );
					warn = 1;
				}
				else{
					$( element ).css( "backgroundColor", "white" );
				}
			});
			if(warn!=0){
				alert("Please enter all complusory blocks");
				return false;
			}

			if(cur_date>form_date){
				var response = confirm("Entry date is old than today. Do you want to proceed. ?");
			}
			else{
				var response = confirm("Are you sure?");
			}
			return response;
		}
	</script>
	<link href="jquery/jquery-ui.css" rel="stylesheet" type="text/css" media="screen" />
	<style>
		#wrapper{
			border: 5px solid #;
		}
	</style>
	<style>
		.footer-brand{
			display:inline-flex;
			align-items:center;
			gap:10px; /* space between image & text */

			font-size:20px;
			font-weight:600;

			color:#333;
			text-decoration:none;
		}

		.footer-brand:hover{
			text-decoration:none;
			color:#ff7a00;
		}

		.footer-logo{
			height:38px;
			width:auto;
		}
	</style>    <script>
        $(".dropdown dt a").on('click', function() {
            $(".dropdown dd ul").slideToggle('fast');
        });

        $(".dropdown dd ul li a").on('click', function() {
            $(".dropdown dd ul").hide();
        });

        function getSelectedValue(id) {
            return $("#" + id).find("dt a span.value").html();
        }

        $(document).bind('click', function(e) {
            var $clicked = $(e.target);
            if (!$clicked.parents().hasClass("dropdown")) $(".dropdown dd ul").hide();
        });

        $('.mutliSelect input[type="checkbox"]').on('click', function() {

            var title = $(this).closest('.mutliSelect').find('input[type="checkbox"]').val(),
                title = $(this).val() + ",";

            if ($(this).is(':checked')) {
                var html = '<span title="' + title + '">' + title + '</span>';
                $('.multiSel').append(html);
                $(".hida").hide();
            } else {
                $('span[title="' + title + '"]').remove();
                var ret = $(".hida");
                $('.dropdown dt a').append(ret);

            }
        });


        // defining flags
        var isCtrl = false;
        var isAlt = false;
        // helpful function that outputs to the container
        // the magic :)

            </script>

    <link rel="stylesheet" href="css/index_1_responsive.css">
<style>
	#atg_table .sortable {
		cursor: pointer;
		user-select: none;
	}

	#atg_table .sortable:hover {
		background: #dcecff;
	}

	#atg_table .sort-arrow {
		font-size: 11px;
		margin-left: 4px;
	}

	.rpt-view-btns {
		margin-bottom: 10px;
	}

	.rpt-view-btns .btn {
		margin-right: 8px;
	}

	.rpt-view-btns .btn.active-view {
		box-shadow: inset 0 0 0 2px #1A2B4A;
		font-weight: 700;
	}

	/* Table Header & Title Customizations */
	table.rpt {
		width: 100%;
		border-collapse: collapse;
		border: 1.5px solid #1A2B4A !important;
		font-size: 15px;
	}

	table.rpt th,
	table.rpt td {
		border: 1px solid #cbd5e1 !important;
		padding: 8px 10px;
		vertical-align: middle;
	}

	table.rpt thead th,
	table.rpt thead th.sorting,
	table.rpt thead th.sorting_asc,
	table.rpt thead th.sorting_desc {
		color: #08386b !important;
	}

	tr.rpt-title td {
		background: #ffffff !important;
		font-size: 22px !important;
		font-weight: 800 !important;
		text-align: center !important;
		padding: 10px !important;
		border-bottom: 2px solid #1A2B4A !important;
		color: #08386b !important;
	}

	tr.rpt-dateline td {
		background: #ffffff !important;
		text-align: right !important;
		font-size: 16px !important;
		font-weight: 700 !important;
		padding: 6px 12px !important;
		border-top: none !important;
		color: #08386b !important;
	}

	.date-box {
		display: inline-block !important;
		border: 1.5px solid #1A2B4A !important;
		padding: 4px 12px !important;
		font-size: 16px !important;
		font-weight: 700 !important;
		color: #08386b !important;
		background: #f8fafc !important;
		border-radius: 4px !important;
	}

	tr.rpt-hdr th {
		background: #d9ecfc  !important;
		font-size: 18px !important;
		font-weight: 700 !important;
		text-align: center !important;
		color: #08386b !important;
		border: 1px solid #0f172a !important;
		padding: 10px 8px !important;
	}

	tr.rpt-num th {
		background: #d9ecfc  !important;
		font-size: 15px !important;
		font-weight: 700 !important;
		text-align: center !important;
		color: #08386b !important;
		border: 1px solid #0f172a !important;
		padding: 6px 4px !important;
	}

	tr.rpt-state-total td,
	tr.rpt-state-total th {
		background: #d9ecfc  !important;
		font-size: 18px !important;
		font-weight: 700 !important;
		text-align: center !important;
		color: #08386b !important;
		border: 1px solid #0f172a !important;
		padding: 8px !important;
	}

	tr.rpt-state-total td.lbl,
	tr.rpt-state-total th.lbl {
		text-align: right !important;
		font-weight: 700 !important;
		color: #08386b !important;
	}

	table.rpt a {
		color: #08386b;
		font-weight: 600;
		text-decoration: underline;
	}

	table.rpt a:hover {
		color: #fd7e14;
		text-decoration: none;
	}

	tr.rpt-div-hdr td,
	tr.rpt-div-hdr th {
		background: #1A2B4A !important;
		font-size: 18px !important;
		font-weight: 700 !important;
		color: #ffffff !important;
		padding: 8px 12px !important;
		border: 1px solid #0f172a !important;
	}

	tr.rpt-dis td {
		background: #ffffff;
		font-size: 16px;
		color: #1e293b;
		border: 1px solid #cbd5e1;
	}

	tr.rpt-dis:hover td {
		background: #f1f5f9;
	}

	table.rpt thead tr.rpt-hdr th {
    cursor: pointer !important;
    position: relative;
}

table.rpt thead tr.rpt-hdr th:hover {
    background: #c7e3f8 !important;
}

table.rpt .custom-sort-arrow {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    margin-left: 5px;
    white-space: nowrap;
}

.rpt-scope-label {
	padding: 8px 14px 0;
	font-weight: 700;
	font-size: 15px;
	color: #08386b;
}
</style>

<style>
/* =========================================================
   PROFESSIONAL USER DASHBOARD HEADER
   ========================================================= */

.user-dashboard-header {
    width: 100%;
    margin: 0 0 22px 0;
    background: #ffffff;
    border: 1px solid #dbe5ef;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(15, 43, 77, 0.10);
}

/* Main title */
.user-dashboard-title {
    /* background: linear-gradient(135deg, #08386b, #1769aa); */
    background: linear-gradient(306deg, #a0dac1, #3b93da);
    /* color: #ffffff; */
    color: black;
    text-align: center;
    font-size: 24px;
    font-weight: 700;
    padding: 15px 20px;
    letter-spacing: .2px;
}

/* Details area */
.user-dashboard-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    background: #ffffff;
}

/* Individual information box */
.user-info-box {
    padding: 16px 22px;
    min-height: 90px;
    display: flex;
    align-items: center;
}

.user-info-box:first-child {
    border-right: 1px solid #e3eaf2;
}

.user-info-icon {
    width: 46px;
    height: 46px;
    min-width: 46px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 14px;
    font-size: 20px;
    color: #ffffff;
    background: linear-gradient(135deg, #0d6efd, #084298);
}

.user-info-content {
    flex: 1;
}

.user-info-label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-bottom: 3px;
}

.user-info-value {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #172b4d;
    line-height: 1.5;
}

.user-info-sub {
    display: block;
    font-size: 14px;
    color: #475569;
    margin-top: 2px;
}

.user-helpdesk {
    color: #0b7a55 !important;
    font-weight: 800 !important;
}

/* Bottom small accent */
.user-dashboard-footer-line {
    height: 4px;
    background: linear-gradient(
        90deg,
        #0d9488,
        #0d6efd,
        #7c3aed,
        #f59e0b
    );
}

/* Mobile */
@media (max-width: 768px) {

    .user-dashboard-title {
        font-size: 20px;
        padding: 13px 15px;
    }

    .user-dashboard-details {
        grid-template-columns: 1fr;
    }

    .user-info-box {
        padding: 13px 15px;
        min-height: auto;
    }

    .user-info-box:first-child {
        border-right: none;
        border-bottom: 1px solid #e3eaf2;
    }

    .user-info-value {
        font-size: 15px;
    }

    .user-info-sub {
        font-size: 13px;
    }
}
</style>



</head>

<body class="sidebar-mini">
    <div class="wrapper">val-->0    <script>
        document.addEventListener('DOMContentLoaded', function () {
                        const dropdown = document.getElementById('navbarDropdownMenuLink');

            if (dropdown) {
                dropdown.style.display = 'none';
            }
                    });
    </script>
		<div class="sidebar" data-color="blue" data-image="images/sidebar-5.jpg" style="z-index: 999;">
			<!--

			Tip 1: you can change the color of the sidebar using: data-color="blue | azure | green | orange | red | purple | teal"
			Tip 2: you can also add an image using data-image tag
		-->
			<div class="sidebar-wrapper">
				<div class="logo">
					<a href="#" class="simple-text logo-mini"><span class="nc-icon nc-send"></span></a>
					<a href="#" class="simple-text  logo-normal">UPCDC &trade;</a>
				</div>

				<ul class="nav">
					                    <li routerlinkactive="active" class="nav-item active"><a class="nav-link" href="index_1.php"><i class="fa fa-chart-pie"></i><p>Dashboard</p></a>
                    <!-- =========================
                         APP MENU 1 - Inspection Form
                    ========================== -->
                    <li class="nav-item active">
                        <a class="nav-link" href="inspection_form_purchase_center.php">
                            <i class="fa fa-clipboard-check"></i>
                            <p>क्रय केन्द्रों का निरीक्षण</p>
                        </a>
                    </li>

                    <!-- =========================
                         APP MENU 2 - Inspection Form
                    ========================== -->
                    <li class="nav-item active">
                        <a class="nav-link" href="inspection_form_wheat_purchase.php">
                            <i class="fa fa-clipboard-check"></i>
                            <p>चावल मिलों का निरीक्षण</p>
                        </a>
                    </li>

                    <!-- =========================
                         APP MENU 3 - Inspection Form
                    ========================== -->
                    <li class="nav-item active">
                        <a class="nav-link" href="inspection_form_frk.php">
                            <i class="fa fa-clipboard-check"></i>
                            <p>एफ०आर०के० निर्माता निरीक्षण</p>
                        </a>
                    </li>

                    <!-- =========================
                         APP MENU 4 - Inspection Form
                    ========================== -->
                    <li class="nav-item active">
                        <a class="nav-link" href="inspection.php">
                            <i class="far fa-chart-bar"></i>
                            <p>M-PACS का निरीक्षण</p>
                        </a>
                    </li>

                				</ul>
			</div>
		</div>
		<div class="main-panel">
			<nav class="navbar navbar-expand-lg ">
				<div class="container-fluid">
					<div class="navbar-wrapper">
						<a class="navbar-brand page-title" href="#"
							style="font-size:24px; color:#F83A3D"></a>
					</div>
					<button class="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse"
						aria-controls="navigation-index" aria-expanded="false" aria-label="Toggle navigation">
						<span class="navbar-toggler-bar burger-lines"></span>
						<span class="navbar-toggler-bar burger-lines"></span>
						<span class="navbar-toggler-bar burger-lines"></span>
					</button>
					<div class="collapse navbar-collapse justify-content-end">
						<ul class="navbar-nav">
							<li class="nav-item dropdown">
								<a class="" id="navbarDropdownMenuLink" data-toggle="dropdown" aria-haspopup="true"
									aria-expanded="false" href="#"><button class="btn btn-info"><i class="fa fa-user-lock"></i>
										</button></a>&nbsp;
								<div class="dropdown-menu" aria-labelledby="navbarDropdownMenuLink">
									<a class="dropdown-item" href="#">Profile</a>
									<a class="dropdown-item" href="#">Activity Log</a>
									<div class="divider"></div>
									<a class="dropdown-item" href="signout.php"><i class="fas fa-sign-out-alt"></i>Signout</a>
								</div>
							</li>
						</ul>
					</div>
				</div>
			</nav>
			<div class="content">
				<div class="container-fluid">

					
	<!-- Modal for Inline Society Details -->
	<div class="modal fade" id="societyDetailModal" tabindex="-1" role="dialog" aria-labelledby="socModalTitle" aria-hidden="true">
		<div class="modal-dialog modal-lg modal-dialog-centered" role="document" style="max-width: 90%;">
			<div class="modal-content">
				<div class="modal-header" style="background: #08386b; color: #ffffff;">
					<h5 class="modal-title" id="socModalTitle" style="font-weight: 700; color: #ffffff !important; display: inline-block;">Society Details</h5>
					<button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: #ffffff; opacity: 0.9; float: right;">
						<span aria-hidden="true">&times;</span>
					</button>
				</div>
				<div class="modal-body" id="socModalBody" style="max-height: 75vh; overflow-y: auto;">
					<div class="text-center p-4">Loading details...</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
				</div>
			</div>
		</div>
	</div>

<script>
	function openSocietyModal(cat, level, id, titleName) {
		$('#socModalTitle').text(titleName || 'Society List');
		$('#socModalBody').html('<div class="text-center p-4"><i class="fa fa-spinner fa-spin fa-2x"></i><br>Loading details...</div>');
		$('#societyDetailModal').modal('show');

		$.ajax({
			url: 'index_1.php',
			type: 'GET',
			data: {
				ajax_action: 'fetch_society_list',
				cat: cat,
				level: level,
				id: id
			},
			success: function(html) {
				$('#socModalBody').html(html);
				if (typeof $.fn.DataTable !== 'undefined' && $('#modal_soc_table').length > 0) {
					$('#modal_soc_table').DataTable({
						"pageLength": 25,
						"ordering": true
					});
				}
			},
			error: function() {
				$('#socModalBody').html('<div class="alert alert-danger text-center">Failed to load details. Please try again.</div>');
			}
		});
	}
</script>

				</div>
			</div>
			<footer class="footer">
				<div class="container-fluid">
					<nav class="pull-left">
						<ul>
							<li>
								<a href="#">
									Home
								</a>
							</li>
						</ul>
					</nav>
                    <p class="copyright text-center">

                        <a href="http://www.upcdc.in" target="_blank" class="footer-brand">

                            <img src="images/coop_logo.png"
                                 class="img-rounded footer-logo">

                            <span>UPCDC</span>

                        </a>

                    </p>
				</div>
			</footer>
	    </div>
	</div>
<script src="js/chart.min.js"></script>
<script>
	(function () {
		var panels = document.querySelectorAll('.rpt-panel-wrap');
		panels.forEach(function (wrap) {
			wrap.addEventListener('mouseenter', function () { document.body.style.overflow = 'hidden'; });
			wrap.addEventListener('mouseleave', function () { document.body.style.overflow = ''; });
			wrap.addEventListener('touchstart', function () { document.body.style.overflow = 'hidden'; }, { passive: true });
			wrap.addEventListener('touchend', function () { document.body.style.overflow = ''; });
		});
	})();

	function countUp(el, target, duration) {
		var start = 0;
		var step = target / (duration / 16);
		var timer = setInterval(function () {
			start += step;
			if (start >= target) { start = target; clearInterval(timer); }
			el.textContent = Math.floor(start).toLocaleString('en-IN');
		}, 16);
	}

	document.addEventListener('DOMContentLoaded', function () {
		document.querySelectorAll('.sc-count[data-target]').forEach(function (el) {
			countUp(el, parseInt(el.getAttribute('data-target')), 1200);
		});
	});
</script>
<script>
$(document).ready(function () {

    /* =========================================================
       COMMON FUNCTION - REPORT TABLE SORTING
       ========================================================= */
    function initReportSorting(tableId) {

        var $table = $('#' + tableId);

        if (!$table.length || typeof $.fn.DataTable === 'undefined') {
            return;
        }

        /*
         * Disable DataTables' normal header click handling.
         * We will attach sorting ONLY to the visible .rpt-hdr row.
         */
        var dt = $table.DataTable({
            pageLength: 25,

            lengthMenu: [
                [25, 50, 100, -1],
                [25, 50, 100, "All"]
            ],

            ordering: true,

            /*
             * Important for multiple THEAD rows.
             */
            order: [],

            orderCellsTop: false,

            autoWidth: false,

            columnDefs: [
                {
                    targets: 0,
                    orderable: false,
                    searchable: false
                }
            ]
        });


        /* =====================================================
           REMOVE DEFAULT DATATABLE HEADER CLICK EVENTS
           FROM ALL HEADER CELLS
           ===================================================== */
        $table.find('thead th').off('click.DT');


        /* =====================================================
           SORT ONLY THE REAL REPORT HEADER (.rpt-hdr)
           ===================================================== */
        $table.find('thead tr.rpt-hdr th').each(function (index) {

            var $th = $(this);

            /*
             * First column = SN
             * Do not sort SN.
             */
            if (index === 0) {
                $th.css('cursor', 'default');
                return;
            }

            $th.css({
                'cursor': 'pointer',
                'user-select': 'none'
            });

            /* Add sorting arrow */
            if ($th.find('.custom-sort-arrow').length === 0) {
                $th.append(
                    '<span class="custom-sort-arrow" ' +
                    'style="font-size:11px;margin-left:5px;">↕</span>'
                );
            }

            $th.on('click', function (e) {

                e.preventDefault();
                e.stopPropagation();

                var currentOrder = dt.order();

                var currentColumn = -1;
                var currentDirection = 'asc';

                if (currentOrder && currentOrder.length > 0) {
                    currentColumn = parseInt(currentOrder[0][0]);
                    currentDirection = currentOrder[0][1];
                }

                /*
                 * Toggle ASC / DESC
                 */
                var newDirection = 'asc';

                if (currentColumn === index) {
                    newDirection =
                        currentDirection === 'asc' ? 'desc' : 'asc';
                }

                /*
                 * Apply sorting
                 */
                dt.order([
                    [index, newDirection]
                ]).draw();

                /*
                 * Update arrows
                 */
                $table.find('.custom-sort-arrow').text('↕');

                if (newDirection === 'asc') {
                    $th.find('.custom-sort-arrow').text('▲');
                } else {
                    $th.find('.custom-sort-arrow').text('▼');
                }

                /*
                 * Re-number SN
                 */
                renumberReportTable(dt);
            });
        });


        /* =====================================================
           RE-NUMBER SN AFTER SORT / SEARCH / PAGINATION
           ===================================================== */
        function renumberReportTable(api) {

            var i = 1;

            api.rows({
                search: 'applied',
                order: 'applied',
                page: 'current'
            }).every(function () {

                var rowNode = this.node();

                /*
                 * Do not modify State Total row
                 */
                if ($(rowNode).hasClass('rpt-state-total')) {
                    return;
                }

                $(rowNode).find('td:first').text(i++);
            });
        }


        /* Run initially */
        renumberReportTable(dt);


        /*
         * Re-number after DataTables operations
         */
        dt.on('draw.dt', function () {
            renumberReportTable(dt);
        });

        return dt;
    }


    /* =========================================================
       DIVISION WISE
       ========================================================= */
    initReportSorting('division_atg_table');


    /* =========================================================
       DISTRICT WISE
       ========================================================= */
    initReportSorting('district_atg_table');


    /* =========================================================
       TEHSEEL / BLOCK WISE (AR / ADCO)
       ========================================================= */
    initReportSorting('tehseel_atg_table');
    initReportSorting('block_atg_table');

});
</script>
    <!--  Notifications Plugin    -->
    <script src="js/bootstrap-notify.js"></script>
    <script src="js/light-bootstrap-dashboard.js"></script>
    <script src="dataTables/datatables.min.js"></script>

    <!--  Google Maps Plugin    -->
    <!-- <script type="text/javascript" src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY_HERE"></script>-->


    <script>
        $(document).ready(function() {
            // action on key up
            $(document).keyup(function(e) {
                if(e.which == 17) {
                    isCtrl = false;
                }
            });
            $(document).keyup(function(e) {
                if(e.which == 18) {
                    isAlt = false;
                }
            });
            // action on key down 17, 18, 82
            $(document).keydown(function(e) {
                if(e.which == 17) {
                    isCtrl = true;
                }
                if(e.which == 18) {
                    isAlt = true;
                }
                if(e.which == 191 && isCtrl) {
                    //console.log($("#shortcut_command"));
                    $("#shortcut_command").focus();
                }
                if(e.which == 89 && isCtrl && isAlt) {
                    if(form_type=='sale'){
                        if($("#supplier_sno").val()==''){
                            alert("Please select a customer.");
                            $("#supplier").focus();
                            return;
                        }
                        var current = $("#current").val();
                        var part = "part_desc"+current;
                        var parent_tr = $("input[name="+part+"_product]").closest('tr');
                        if(parent_tr.css("background-color")=='rgb(255, 0, 0)'){
                            parent_tr.css("background-color", "#cccccc");
                            $("#part_desc"+current+"_return_flag").val("0");
                        }
                        else{
                            parent_tr.css("background-color", "#FF0000");
                            $("#part_desc"+current+"_return_flag").val("1");
                        }
                    }
                }
            });

        });
    </script>
    
	<!-- Default Statcounter code for UPCOD https://upcod.in/
-->
<script type="text/javascript">
var sc_project=12961757; 
var sc_invisible=1; 
var sc_security="0a24b0c2"; 
</script>
<script type="text/javascript"
src="https://www.statcounter.com/counter/counter.js"
async></script>
<noscript><div class="statcounter"><a title="Web Analytics"
href="https://statcounter.com/" target="_blank"><img
class="statcounter"
src="https://c.statcounter.com/12961757/0/0a24b0c2/1/"
alt="Web Analytics"
referrerPolicy="no-referrer-when-downgrade"></a></div></noscript>
<!-- End of Statcounter Code -->
	
	
	</body>
</html>